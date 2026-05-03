// Discord dispatcher — POSTs an embed to a customer-configured
// incoming webhook URL. No HMAC: the URL itself is the secret
// (Discord's authn model for incoming webhooks).

import type {
  DispatchResult,
  IntegrationDispatcher,
} from '../registry'

const REQUEST_TIMEOUT_MS = 10_000

// Embed accent colors per ticket kind. Discord wants a 24-bit int.
const KIND_COLOR: Record<string, number> = {
  bug: 0xef4444, // red
  feature: 0x22c55e, // green
  query: 0x3b82f6, // blue
  spam: 0x6b7280, // gray
}

const KIND_EMOJI: Record<string, string> = {
  bug: '🐛',
  feature: '✨',
  query: '❓',
  spam: '🗑️',
}

export const discordDispatcher: IntegrationDispatcher = {
  kind: 'discord',
  async dispatch(input): Promise<DispatchResult> {
    if (input.creds.kind !== 'discord') {
      return {
        ok: false,
        responseCode: null,
        responseBody: null,
        requestBody: '',
        error: 'creds kind mismatch',
      }
    }
    const { webhook_url } = input.creds
    const { ticket, workspace } = input.payload
    const c = ticket.classification
    const emoji = KIND_EMOJI[c.primary] ?? ''
    const color = KIND_COLOR[c.primary] ?? 0x000000

    // Discord caps title at 256, description at 4096, field value at 1024.
    // We stay well under to avoid edge-case truncation rejection.
    const title = `${emoji} ${c.suggested_title}`.slice(0, 240)
    const description = ticket.message.slice(0, 2000)

    const fields: Array<{ name: string; value: string; inline: boolean }> = [
      {
        name: 'Kind',
        value: `${c.primary} · ${(c.confidence * 100).toFixed(0)}%`,
        inline: true,
      },
      { name: 'Domain', value: workspace.domain, inline: true },
    ]
    if (ticket.email) {
      fields.push({ name: 'From', value: ticket.email, inline: true })
    }

    const body = {
      // `content` is the plain-text fallback shown in mobile previews
      // and notifications. Keep it short.
      content: `${emoji} New ${c.primary} from \`${workspace.domain}\``,
      embeds: [
        {
          title,
          description,
          color,
          url: ticket.page_url ?? undefined,
          fields,
          footer: { text: 'FeedbackBot' },
          timestamp: new Date(ticket.created_at).toISOString(),
        },
      ],
      // Don't ping anyone via the content text — embeds shouldn't
      // accidentally @-mention.
      allowed_mentions: { parse: [] as Array<string> },
    }
    const requestBody = JSON.stringify(body)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
    try {
      // ?wait=true asks Discord to return the posted message JSON
      // instead of a bare 204 — gives us a useful response body to
      // surface in the deliveries log.
      const res = await fetch(`${webhook_url}?wait=true`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'content-type': 'application/json',
          'user-agent': 'FeedbackBot/1.0',
        },
        body: requestBody,
      })
      const responseBody = await res.text().catch(() => '')
      return {
        ok: res.ok,
        responseCode: res.status,
        responseBody: responseBody.slice(0, 2000),
        requestBody,
      }
    } catch (err) {
      return {
        ok: false,
        responseCode: null,
        responseBody: null,
        requestBody,
        error: err instanceof Error ? err.message : String(err),
      }
    } finally {
      clearTimeout(timeoutId)
    }
  },
}
