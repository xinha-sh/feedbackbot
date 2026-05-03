import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { githubDispatcher } from './dispatch'
import type { OutboundTicketPayload } from '#/schema/integration'

const PAYLOAD: OutboundTicketPayload = {
  event: 'ticket.created',
  workspace: { id: 'ws_x', domain: 'example.com' },
  ticket: {
    id: 'tkt_1',
    message: 'the dashboard crashes when I open the integrations tab',
    page_url: 'https://example.com/dashboard',
    email: 'alice@example.com',
    created_at: 1_700_000_000_000,
    classification: {
      primary: 'bug',
      secondary: [],
      confidence: 0.92,
      summary: 'dashboard crashes',
      suggested_title: 'Dashboard crashes on integrations tab',
    },
  },
  delivery: { id: 'dlv_1', attempt: 0 },
}

const CREDS = {
  kind: 'github' as const,
  access_token: 'gho_abcDEFghi123',
  login: 'octocat',
}

const ROUTE = { owner: 'peppyhop', repo: 'feedbackbot', labels: [] }

describe('githubDispatcher', () => {
  const realFetch = globalThis.fetch
  const fetchMock = vi.fn()
  beforeEach(() => {
    fetchMock.mockReset()
    globalThis.fetch = fetchMock as unknown as typeof fetch
  })
  afterEach(() => {
    globalThis.fetch = realFetch
  })

  it('POSTs to /repos/:owner/:repo/issues with bearer auth and Github JSON accept', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 201,
      text: async () =>
        JSON.stringify({ html_url: 'https://github.com/peppyhop/feedbackbot/issues/42' }),
    })
    const result = await githubDispatcher.dispatch({
      creds: CREDS,
      routeConfig: ROUTE,
      payload: PAYLOAD,
      hmacSeed: 'unused',
    })
    expect(result.ok).toBe(true)
    expect(result.responseCode).toBe(201)

    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe(
      'https://api.github.com/repos/peppyhop/feedbackbot/issues',
    )
    expect((init as RequestInit).method).toBe('POST')
    const headers = (init as RequestInit).headers as Record<string, string>
    expect(headers['authorization']).toBe('Bearer gho_abcDEFghi123')
    expect(headers['accept']).toBe('application/vnd.github+json')
    expect(headers['x-github-api-version']).toBe('2022-11-28')

    const body = JSON.parse((init as RequestInit).body as string)
    expect(body.title).toContain('Dashboard crashes')
    expect(body.body).toContain('the dashboard crashes when I open')
    expect(body.body).toContain('**Kind:** `bug` · 92% confidence')
    expect(body.body).toContain('**Domain:** `example.com`')
    expect(body.body).toContain('**From:** `alice@example.com`')
    expect(body.body).toContain('**FeedbackBot ticket:** `tkt_1`')
    expect(body.labels).toBeUndefined() // empty list → omitted
  })

  it('encodes owner/repo so slashes/spaces in (admittedly invalid) names do not break the URL', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 201,
      text: async () => '{}',
    })
    await githubDispatcher.dispatch({
      creds: CREDS,
      routeConfig: { owner: 'with spaces', repo: 'a/b', labels: [] },
      payload: PAYLOAD,
      hmacSeed: 'unused',
    })
    const [url] = fetchMock.mock.calls[0]!
    expect(url).toBe(
      'https://api.github.com/repos/with%20spaces/a%2Fb/issues',
    )
  })

  it('attaches labels when provided', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 201,
      text: async () => '{}',
    })
    await githubDispatcher.dispatch({
      creds: CREDS,
      routeConfig: { owner: 'o', repo: 'r', labels: ['bug', 'from-feedbackbot'] },
      payload: PAYLOAD,
      hmacSeed: 'unused',
    })
    const body = JSON.parse(
      (fetchMock.mock.calls[0]![1] as RequestInit).body as string,
    )
    expect(body.labels).toEqual(['bug', 'from-feedbackbot'])
  })

  it('returns ok:false on 4xx (e.g., insufficient scopes)', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 403,
      text: async () => '{"message":"Resource not accessible by integration"}',
    })
    const result = await githubDispatcher.dispatch({
      creds: CREDS,
      routeConfig: ROUTE,
      payload: PAYLOAD,
      hmacSeed: 'unused',
    })
    expect(result.ok).toBe(false)
    expect(result.responseCode).toBe(403)
    expect(result.responseBody).toContain('not accessible')
  })

  it('returns ok:false with error on fetch throw', async () => {
    fetchMock.mockRejectedValueOnce(new Error('network down'))
    const result = await githubDispatcher.dispatch({
      creds: CREDS,
      routeConfig: ROUTE,
      payload: PAYLOAD,
      hmacSeed: 'unused',
    })
    expect(result.ok).toBe(false)
    expect(result.responseCode).toBeNull()
    expect(result.error).toBe('network down')
  })

  it('rejects on creds-kind mismatch', async () => {
    const result = await githubDispatcher.dispatch({
      creds: {
        kind: 'discord',
        webhook_url: 'https://discord.com/api/webhooks/1/abc',
      },
      routeConfig: ROUTE,
      payload: PAYLOAD,
      hmacSeed: 'unused',
    })
    expect(result.ok).toBe(false)
    expect(result.error).toBe('creds kind mismatch')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('rejects when route config is missing owner/repo (not a github route)', async () => {
    const result = await githubDispatcher.dispatch({
      creds: CREDS,
      routeConfig: { foo: 'bar' },
      payload: PAYLOAD,
      hmacSeed: 'unused',
    })
    expect(result.ok).toBe(false)
    expect(result.error).toContain('route config invalid')
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
