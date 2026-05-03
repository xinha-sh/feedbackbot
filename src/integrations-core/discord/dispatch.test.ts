import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { discordDispatcher } from './dispatch'
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
  kind: 'discord' as const,
  webhook_url:
    'https://discord.com/api/webhooks/1234567890/abcDEFghijKLM-nopQRStuvWXYZ',
}

describe('discordDispatcher', () => {
  const realFetch = globalThis.fetch
  const fetchMock = vi.fn()
  beforeEach(() => {
    fetchMock.mockReset()
    globalThis.fetch = fetchMock as unknown as typeof fetch
  })
  afterEach(() => {
    globalThis.fetch = realFetch
  })

  it('POSTs an embed to the webhook URL with ?wait=true', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => '{"id":"1"}',
    })
    const result = await discordDispatcher.dispatch({
      creds: CREDS,
      routeConfig: {},
      payload: PAYLOAD,
      hmacSeed: 'unused',
    })
    expect(result.ok).toBe(true)
    expect(result.responseCode).toBe(200)

    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe(`${CREDS.webhook_url}?wait=true`)
    expect((init as RequestInit).method).toBe('POST')
    const headers = (init as RequestInit).headers as Record<string, string>
    expect(headers['content-type']).toBe('application/json')

    const body = JSON.parse((init as RequestInit).body as string)
    expect(body.embeds).toHaveLength(1)
    expect(body.embeds[0].title).toContain('Dashboard crashes')
    expect(body.embeds[0].description).toContain('crashes when I open')
    expect(body.embeds[0].url).toBe('https://example.com/dashboard')
    expect(body.embeds[0].color).toBe(0xef4444) // bug = red
    expect(body.embeds[0].fields).toEqual(
      expect.arrayContaining([
        { name: 'Kind', value: 'bug · 92%', inline: true },
        { name: 'Domain', value: 'example.com', inline: true },
        { name: 'From', value: 'alice@example.com', inline: true },
      ]),
    )
  })

  it('disables @-mentions via allowed_mentions', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => '',
    })
    await discordDispatcher.dispatch({
      creds: CREDS,
      routeConfig: {},
      payload: {
        ...PAYLOAD,
        ticket: { ...PAYLOAD.ticket, message: '@everyone please look' },
      },
      hmacSeed: 'unused',
    })
    const [, init] = fetchMock.mock.calls[0]!
    const body = JSON.parse((init as RequestInit).body as string)
    expect(body.allowed_mentions).toEqual({ parse: [] })
  })

  it('omits the From field when ticket.email is null', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => '',
    })
    await discordDispatcher.dispatch({
      creds: CREDS,
      routeConfig: {},
      payload: {
        ...PAYLOAD,
        ticket: { ...PAYLOAD.ticket, email: null },
      },
      hmacSeed: 'unused',
    })
    const [, init] = fetchMock.mock.calls[0]!
    const body = JSON.parse((init as RequestInit).body as string)
    const fieldNames = body.embeds[0].fields.map(
      (f: { name: string }) => f.name,
    )
    expect(fieldNames).toEqual(['Kind', 'Domain'])
  })

  it('returns ok:false on 4xx (e.g., webhook revoked)', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => 'Unauthorized',
    })
    const result = await discordDispatcher.dispatch({
      creds: CREDS,
      routeConfig: {},
      payload: PAYLOAD,
      hmacSeed: 'unused',
    })
    expect(result.ok).toBe(false)
    expect(result.responseCode).toBe(401)
    expect(result.responseBody).toBe('Unauthorized')
  })

  it('returns ok:false with error on fetch throw', async () => {
    fetchMock.mockRejectedValueOnce(new Error('network down'))
    const result = await discordDispatcher.dispatch({
      creds: CREDS,
      routeConfig: {},
      payload: PAYLOAD,
      hmacSeed: 'unused',
    })
    expect(result.ok).toBe(false)
    expect(result.responseCode).toBeNull()
    expect(result.error).toBe('network down')
  })

  it('rejects on creds-kind mismatch (defense for stored creds drift)', async () => {
    const result = await discordDispatcher.dispatch({
      creds: {
        kind: 'webhook',
        url: 'https://x.example/in',
        hmac_secret: 'sixteen-char-min-secret',
      },
      routeConfig: {},
      payload: PAYLOAD,
      hmacSeed: 'unused',
    })
    expect(result.ok).toBe(false)
    expect(result.error).toBe('creds kind mismatch')
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
