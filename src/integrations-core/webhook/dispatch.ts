// Generic signed-webhook dispatcher. POSTs the canonical
// OutboundTicketPayload (Plan.md §8.2) to a customer-configured URL
// with HMAC-SHA256 + timestamp headers.

import { hmacSha256Hex } from '#/lib/crypto'
import type {
  DispatchResult,
  IntegrationDispatcher,
} from '../registry'

const REQUEST_TIMEOUT_MS = 10_000

export const webhookDispatcher: IntegrationDispatcher = {
  kind: 'webhook',
  async dispatch(input): Promise<DispatchResult> {
    if (input.creds.kind !== 'webhook') {
      return {
        ok: false,
        responseCode: null,
        responseBody: null,
        requestBody: '',
        error: 'creds kind mismatch',
      }
    }
    const { url, hmac_secret } = input.creds
    const body = JSON.stringify(input.payload)
    const timestamp = Math.floor(Date.now() / 1000).toString()
    const signature = await hmacSha256Hex(hmac_secret, `${timestamp}.${body}`)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
    try {
      const res = await fetch(url, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'content-type': 'application/json',
          'x-feedback-signature': `sha256=${signature}`,
          'x-feedback-timestamp': timestamp,
          'user-agent': 'FeedbackBot/1.0',
        },
        body,
      })
      const responseBody = await res.text().catch(() => '')
      return {
        ok: res.ok,
        responseCode: res.status,
        responseBody: responseBody.slice(0, 2000),
        requestBody: body,
      }
    } catch (err) {
      return {
        ok: false,
        responseCode: null,
        responseBody: null,
        requestBody: body,
        error: err instanceof Error ? err.message : String(err),
      }
    } finally {
      clearTimeout(timeoutId)
    }
  },
}
