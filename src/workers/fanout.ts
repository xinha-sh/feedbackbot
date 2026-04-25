// Fan-out consumer Worker. Binds to `fanout-queue` + `fanout-dlq`.
//
// Per PLAN.md §8.2:
//   1. Load ticket + classification
//   2. Query integration_routes for (workspace_id, ticket_type)
//   3. Decrypt per-integration credentials
//   4. Dispatch through the per-kind registry
//   5. Write a row to integration_deliveries (one per attempt)
//   6. On non-2xx / timeout: msg.retry() — Queues handles backoff,
//      after max attempts it lands on fanout-dlq.

import {
  getTicket,
  getWorkspaceById,
  makeDb,
  recordDelivery,
  routesForTicketType,
} from '#/db/client'
import { b64ToBytes, decryptCredentials, deriveWorkspaceKey } from '#/lib/crypto'
import {
  IntegrationCredsSchema,
  type IntegrationCreds,
  type OutboundTicketPayload,
} from '#/schema/integration'
import { ClassificationResultSchema } from '#/schema/ticket'
import type { Env } from '#/env'
import { sentryOptions, withSentry } from '#/lib/sentry'

import { getDispatcher } from '#/integrations-core'

type FanoutMessage = {
  ticket_id: string
  workspace_id: string
  attempt?: number
}

const handler: ExportedHandler<Env, FanoutMessage> = {
  async queue(batch, env) {
    for (const msg of batch.messages) {
      try {
        const ok = await dispatchAll(msg.body, msg.attempts, env)
        if (ok) msg.ack()
        else msg.retry()
      } catch (err) {
        console.error('fanout threw', msg.body, err)
        msg.retry()
      }
    }
  },
}

export default withSentry<Env, FanoutMessage>(sentryOptions, handler)

async function dispatchAll(
  msg: FanoutMessage,
  attemptNumber: number,
  env: Env,
): Promise<boolean> {
  const db = makeDb(env.DB)

  const [ticket, workspace] = await Promise.all([
    getTicket(db, msg.workspace_id, msg.ticket_id),
    getWorkspaceById(db, msg.workspace_id),
  ])
  if (!ticket || !workspace) {
    console.warn('fanout: missing ticket or workspace', msg)
    return true // drop — nothing to dispatch.
  }
  if (!ticket.classification || ticket.classification === 'spam') {
    return true // spam never fans out; classify may have flipped.
  }

  const meta = ticket.classificationMeta
    ? ClassificationResultSchema.safeParse(JSON.parse(ticket.classificationMeta))
    : { success: false as const }
  if (!meta.success) {
    console.warn('fanout: classification meta missing/invalid', msg)
    return true
  }

  const routes = await routesForTicketType(
    db,
    msg.workspace_id,
    ticket.classification as 'bug' | 'query' | 'feature',
  )
  if (routes.length === 0) return true // nothing routed; success.

  const masterKey = b64ToBytes(env.INTEGRATIONS_ENCRYPTION_KEY)
  const workspaceKey = await deriveWorkspaceKey(masterKey, workspace.id)

  // Screenshot signed URL — short-lived R2 GET for integrations that
  // want to render an image preview.
  const screenshot_url = ticket.screenshotKey
    ? await presignScreenshotGet(env, ticket.screenshotKey)
    : undefined

  const basePayload: Omit<OutboundTicketPayload, 'delivery'> = {
    event: 'ticket.created',
    workspace: { id: workspace.id, domain: workspace.domain },
    ticket: {
      id: ticket.id,
      message: ticket.message,
      page_url: ticket.pageUrl,
      email: ticket.email,
      created_at: ticket.createdAt,
      classification: {
        primary: meta.data.primary_type,
        secondary: meta.data.secondary_types,
        confidence: meta.data.confidence,
        summary: meta.data.summary,
        suggested_title: meta.data.suggested_title,
      },
      screenshot_url,
    },
  }

  let allOk = true

  for (const route of routes) {
    let creds: IntegrationCreds
    try {
      const decrypted = await decryptCredentials<unknown>(
        workspaceKey,
        route.integration.credentials,
      )
      const parsed = IntegrationCredsSchema.safeParse(decrypted)
      if (!parsed.success) throw new Error('creds shape invalid')
      creds = parsed.data
    } catch (err) {
      await recordDelivery(db, {
        workspaceId: workspace.id,
        integrationId: route.integration.id,
        ticketId: ticket.id,
        status: 'failed',
        attempts: attemptNumber + 1,
        lastError: err instanceof Error ? err.message : String(err),
      })
      allOk = false
      continue
    }

    const dispatcher = getDispatcher(
      route.integration.kind as 'webhook' | 'slack',
    )

    const payload: OutboundTicketPayload = {
      ...basePayload,
      delivery: {
        id: route.id,
        attempt: attemptNumber + 1,
      },
    }

    const routeConfig = safeParseJson(route.config)
    const result = await dispatcher.dispatch({
      creds,
      routeConfig,
      payload,
      hmacSeed: env.HMAC_SECRET_SEED,
    })

    await recordDelivery(db, {
      workspaceId: workspace.id,
      integrationId: route.integration.id,
      ticketId: ticket.id,
      status: result.ok ? 'delivered' : 'failed',
      attempts: attemptNumber + 1,
      lastError: result.error ?? null,
      requestBody: result.requestBody,
      responseCode: result.responseCode,
      responseBody: result.responseBody,
    })

    if (!result.ok) allOk = false
  }

  return allOk
}

async function presignScreenshotGet(
  env: Env,
  key: string,
): Promise<string | undefined> {
  const { mintScreenshotToken, buildGetUrl } = await import(
    '#/lib/screenshot-token'
  )
  const origin =
    env.BETTER_AUTH_URL ??
    // In production BETTER_AUTH_URL is the canonical app origin; fall
    // back to a placeholder so the URL is still syntactically valid
    // for local dev where consumers inspect it via logs.
    'https://usefeedbackbot.com'
  const token = await mintScreenshotToken(env.HMAC_SECRET_SEED, 'get', key)
  return buildGetUrl(origin, key, token)
}

function safeParseJson(s: string): unknown {
  try {
    return JSON.parse(s)
  } catch {
    return {}
  }
}
