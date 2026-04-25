// Slack dispatcher — posts Block Kit messages via chat.postMessage
// (Plan.md §8.3).

import { SlackRouteConfigSchema } from '#/schema/integration'
import type {
  DispatchResult,
  IntegrationDispatcher,
} from '../registry'

const SLACK_POST_MESSAGE = 'https://slack.com/api/chat.postMessage'

const TAG_EMOJI: Record<string, string> = {
  bug: ':bug:',
  feature: ':sparkles:',
  query: ':question:',
  spam: ':wastebasket:',
}

export const slackDispatcher: IntegrationDispatcher = {
  kind: 'slack',
  async dispatch(input): Promise<DispatchResult> {
    if (input.creds.kind !== 'slack') {
      return {
        ok: false,
        responseCode: null,
        responseBody: null,
        requestBody: '',
        error: 'creds kind mismatch',
      }
    }
    const routeConfig = SlackRouteConfigSchema.safeParse(input.routeConfig)
    if (!routeConfig.success) {
      return {
        ok: false,
        responseCode: null,
        responseBody: null,
        requestBody: '',
        error: 'route config invalid',
      }
    }

    const { ticket, workspace } = input.payload
    const c = ticket.classification
    const body = {
      channel: routeConfig.data.channel_id,
      text: `${TAG_EMOJI[c.primary] ?? ''} ${c.suggested_title}`.trim(),
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `${TAG_EMOJI[c.primary] ?? ''} ${c.suggested_title}`.slice(
              0,
              150,
            ),
          },
        },
        {
          type: 'section',
          text: { type: 'mrkdwn', text: ticket.message.slice(0, 2800) },
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: [
                `*${c.primary}* · ${(c.confidence * 100).toFixed(0)}%`,
                workspace.domain,
                ticket.page_url ? `<${ticket.page_url}|page>` : null,
                ticket.email ? `from ${ticket.email}` : null,
              ]
                .filter(Boolean)
                .join(' · '),
            },
          ],
        },
      ],
    }

    const requestBody = JSON.stringify(body)

    try {
      const res = await fetch(SLACK_POST_MESSAGE, {
        method: 'POST',
        headers: {
          'content-type': 'application/json; charset=utf-8',
          authorization: `Bearer ${input.creds.access_token}`,
        },
        body: requestBody,
      })
      const respText = await res.text()
      let parsed: { ok?: boolean; error?: string } = {}
      try {
        parsed = JSON.parse(respText)
      } catch {
        // not JSON — treat as a network-level failure.
      }
      return {
        ok: res.ok && parsed.ok === true,
        responseCode: res.status,
        responseBody: respText.slice(0, 2000),
        requestBody,
        error: parsed.ok === false ? parsed.error : undefined,
      }
    } catch (err) {
      return {
        ok: false,
        responseCode: null,
        responseBody: null,
        requestBody,
        error: err instanceof Error ? err.message : String(err),
      }
    }
  },
}
