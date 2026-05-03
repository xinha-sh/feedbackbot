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

// GLM 4.7 Flash. Tried Gemma 4 (per Plan.md §15) but it's a
// reasoning model that consumed its entire token budget on
// chain-of-thought before emitting the JSON answer (Workers AI
// returned `finish_reason: 'length'`, `content: null` reliably
// across multiple prompt + max_tokens permutations). GLM is
// non-reasoning, smaller, faster, and produces clean
// structured JSON on the first try. DECISIONS.md updated.
const MODEL = '@cf/zai-org/glm-4.7-flash'

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

// Tight, directive prompt. No examples (which invite verbose
// completions), no rationale invitation. Just the rules + the
// required JSON. Works on GLM out of the box.
const SYSTEM_PROMPT = `Classify a feedback ticket into bug | feature | query | spam.

bug = broken / errors / unexpected behavior
feature = a capability the user wants added
query = a how-to / usage question
spam = gibberish, ads, off-topic, exploits

Return JSON only. No prose. Skip your reasoning trace; just the JSON.
Schema fields: primary_type, secondary_types, confidence (0-1, <0.6 when ambiguous), summary (<=80 chars), suggested_title (<=100 chars), reasoning (<=240 chars — one terse sentence).`

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
    // Real outputs are <300 tokens. 1000 is generous safety
    // margin — classifier cost is dwarfed by storage + queues.
    max_tokens: 1000,
  })

  // Workers AI returns several envelope shapes depending on model:
  //   { choices: [{ message: { content: ... } }] }   ← OpenAI-compat (GLM)
  //   { response: "{...}" } / { response: {...} }    ← legacy CF
  //   { result:  ... }                               ← legacy CF alt
  //   { ...parsed... }                               ← top-level
  const parsed = extractClassificationPayload(response)
  if (!parsed) {
    console.error('classify: unrecognized AI response shape', {
      keys:
        response && typeof response === 'object'
          ? Object.keys(response as Record<string, unknown>)
          : null,
      sample: trim(JSON.stringify(response), 400),
    })
    throw new Error('AI response shape not recognized')
  }

  const validation = ClassificationResultSchema.safeParse(parsed)
  if (!validation.success) {
    console.error('classify: AI returned schema-invalid JSON', {
      issues: validation.error.issues.slice(0, 5),
      payload: trim(JSON.stringify(parsed), 400),
    })
    throw new Error('AI returned schema-invalid JSON')
  }
  return validation.data
}

export function extractClassificationPayload(response: unknown): unknown {
  if (!response || typeof response !== 'object') return null
  const r = response as Record<string, unknown>

  // OpenAI-compat envelope (Gemma 3+ on Workers AI):
  //   { choices: [{ message: { content: "<json string>" } }], ... }
  // Strict-mode JSON output puts the text in `content`. Reasoning
  // models also expose a separate `reasoning` field — we ignore it.
  const choices = r.choices
  if (Array.isArray(choices) && choices.length > 0) {
    const msg = (choices[0] as { message?: unknown })?.message
    if (msg && typeof msg === 'object') {
      const content = (msg as { content?: unknown }).content
      if (typeof content === 'string') {
        const tried = tryParseJson(content)
        if (tried && typeof tried === 'object' && 'primary_type' in tried) return tried
      } else if (content && typeof content === 'object' && 'primary_type' in (content as Record<string, unknown>)) {
        return content
      }
    }
  }

  // Legacy CF Workers AI envelopes: { response: ... } and { result: ... }
  for (const key of ['response', 'result'] as const) {
    const val = r[key]
    if (typeof val === 'string') {
      const tried = tryParseJson(val)
      if (tried && typeof tried === 'object' && 'primary_type' in tried) return tried
    } else if (val && typeof val === 'object' && 'primary_type' in (val as Record<string, unknown>)) {
      return val
    }
  }
  // Top-level fallback: maybe the SDK already unwrapped.
  if ('primary_type' in r) return r
  return null
}

function tryParseJson(s: string): unknown {
  try {
    return JSON.parse(s)
  } catch {
    return null
  }
}

function trim(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max)}…` : s
}
