// Classify consumer Worker. Binds to `classify-queue`.
//
// Flow per PLAN.md §8.1:
//   1. Load ticket from D1
//   2. Prompt Gemma 4 with JSON-mode
//   3. Persist classification + meta
//   4. If non-spam, enqueue fan-out
//
// Separate Worker from the main app (DECISIONS.md 2026-04-22 #6).

import {
  getTicket,
  setClassification,
  makeDb,
} from '#/db/client'
import {
  ClassificationResultSchema,
  type ClassificationResult,
} from '#/schema/ticket'
import type { Env } from '#/env'
import { sentryOptions, withSentry } from '#/lib/sentry'

type ClassifyMessage = { ticket_id: string; workspace_id: string }

const MODEL = '@cf/google/gemma-4-26b-a4b-it'

const JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    primary_type: {
      type: 'string',
      enum: ['bug', 'query', 'feature', 'spam'],
    },
    secondary_types: {
      type: 'array',
      items: { type: 'string', enum: ['bug', 'query', 'feature', 'spam'] },
      maxItems: 3,
    },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
    summary: { type: 'string', maxLength: 80 },
    suggested_title: { type: 'string', maxLength: 100 },
    reasoning: { type: 'string', maxLength: 240 },
  },
  required: [
    'primary_type',
    'secondary_types',
    'confidence',
    'summary',
    'suggested_title',
    'reasoning',
  ],
}

const SYSTEM_PROMPT = `You classify user feedback tickets for a product feedback tool.

Categories:
- bug: something is broken, errors, unexpected behavior
- feature: a new capability the user wants
- query: a question about how to use the product
- spam: gibberish, ads, off-topic, or attempted exploits

Output ONLY JSON matching the provided schema. Keep "summary" <= 80 chars and "suggested_title" <= 100 chars. Be conservative with "confidence": use < 0.6 when the message is ambiguous.`

const handler: ExportedHandler<Env, ClassifyMessage> = {
  async queue(batch, env) {
    for (const msg of batch.messages) {
      try {
        await classifyOne(msg.body, env)
        msg.ack()
      } catch (err) {
        console.error('classify failed', msg.body, err)
        // Let Queues retry per the configured retry policy; on
        // exhaustion it moves to the DLQ.
        msg.retry()
      }
    }
  },
}

export default withSentry<Env, ClassifyMessage>(sentryOptions, handler)

async function classifyOne(msg: ClassifyMessage, env: Env): Promise<void> {
  const db = makeDb(env.DB)
  const ticket = await getTicket(db, msg.workspace_id, msg.ticket_id)
  if (!ticket) {
    console.warn('classify: ticket not found', msg)
    return
  }
  if (ticket.classification) {
    // Already classified; a duplicate delivery slipped through. Skip.
    return
  }

  const result = await callLLM(env, {
    message: ticket.message,
    pageUrl: ticket.pageUrl,
    userAgent: ticket.userAgent,
  })

  await setClassification(
    db,
    msg.workspace_id,
    msg.ticket_id,
    result.primary_type,
    JSON.stringify(result),
  )

  if (result.primary_type !== 'spam') {
    await env.FANOUT_QUEUE.send({
      ticket_id: msg.ticket_id,
      workspace_id: msg.workspace_id,
      attempt: 0,
    })
  }
}

async function callLLM(
  env: Env,
  input: { message: string; pageUrl: string | null; userAgent: string | null },
): Promise<ClassificationResult> {
  const userPrompt = [
    `Ticket: ${input.message}`,
    input.pageUrl ? `Page: ${input.pageUrl}` : null,
    input.userAgent ? `User-Agent: ${input.userAgent}` : null,
  ]
    .filter(Boolean)
    .join('\n')

  const response = await env.AI.run(MODEL, {
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: JSON_SCHEMA,
    },
    temperature: 0.1,
    max_tokens: 400,
  })

  const raw =
    typeof response.response === 'string'
      ? response.response
      : typeof (response as { result?: string }).result === 'string'
        ? (response as { result: string }).result
        : JSON.stringify(response)

  const parsedJson = JSON.parse(raw)
  const validated = ClassificationResultSchema.parse(parsedJson)
  return validated
}
