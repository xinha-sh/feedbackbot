// GitHub Issues dispatcher — POSTs an issue to a configured repo
// via the REST API. One issue per ticket, body includes the
// classification + page URL + email.

import { GitHubRouteConfigSchema } from '#/schema/integration'
import type {
  DispatchResult,
  IntegrationDispatcher,
} from '../registry'

const REQUEST_TIMEOUT_MS = 10_000

const KIND_EMOJI: Record<string, string> = {
  bug: '🐛',
  feature: '✨',
  query: '❓',
  spam: '🗑️',
}

export const githubDispatcher: IntegrationDispatcher = {
  kind: 'github',
  async dispatch(input): Promise<DispatchResult> {
    if (input.creds.kind !== 'github') {
      return {
        ok: false,
        responseCode: null,
        responseBody: null,
        requestBody: '',
        error: 'creds kind mismatch',
      }
    }
    const route = GitHubRouteConfigSchema.safeParse(input.routeConfig)
    if (!route.success) {
      return {
        ok: false,
        responseCode: null,
        responseBody: null,
        requestBody: '',
        error: 'route config invalid: missing owner/repo',
      }
    }

    const { owner, repo, labels } = route.data
    const { ticket, workspace } = input.payload
    const c = ticket.classification

    const title = `${KIND_EMOJI[c.primary] ?? ''} ${c.suggested_title}`.trim()
    const body = buildIssueBody({
      message: ticket.message,
      kind: c.primary,
      confidence: c.confidence,
      domain: workspace.domain,
      pageUrl: ticket.page_url,
      email: ticket.email,
      ticketId: ticket.id,
    })

    const requestBody = JSON.stringify({
      title: title.slice(0, 256), // GitHub caps at 256
      body,
      labels: labels && labels.length > 0 ? labels : undefined,
    })

    const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues`

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
    try {
      const res = await fetch(url, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'content-type': 'application/json',
          accept: 'application/vnd.github+json',
          authorization: `Bearer ${input.creds.access_token}`,
          'x-github-api-version': '2022-11-28',
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

function buildIssueBody(input: {
  message: string
  kind: string
  confidence: number
  domain: string
  pageUrl: string | null
  email: string | null
  ticketId: string
}): string {
  const lines: Array<string> = []
  lines.push(input.message.trim())
  lines.push('')
  lines.push('---')
  lines.push('')
  lines.push(
    `**Kind:** \`${input.kind}\` · ${(input.confidence * 100).toFixed(0)}% confidence`,
  )
  lines.push(`**Domain:** \`${input.domain}\``)
  if (input.pageUrl) lines.push(`**Page:** ${input.pageUrl}`)
  if (input.email) lines.push(`**From:** \`${input.email}\``)
  lines.push(`**FeedbackBot ticket:** \`${input.ticketId}\``)
  return lines.join('\n')
}
