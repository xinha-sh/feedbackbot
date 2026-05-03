import { describe, expect, it } from 'vitest'
import { buildInstallUrl, mintState, verifyState } from './oauth'

const SEED = 'test-seed'

describe('github OAuth state', () => {
  it('round-trips mint + verify', async () => {
    const state = await mintState('ws_abc123', SEED)
    const result = await verifyState(state, SEED)
    expect(result.ok).toBe(true)
    expect(result.workspaceId).toBe('ws_abc123')
  })

  it('rejects a tampered state', async () => {
    const state = await mintState('ws_abc123', SEED)
    const tampered = state.slice(0, -1) + (state.slice(-1) === '0' ? '1' : '0')
    expect((await verifyState(tampered, SEED)).ok).toBe(false)
  })

  it('rejects state with a different seed', async () => {
    const state = await mintState('ws_abc123', SEED)
    expect((await verifyState(state, 'other-seed')).ok).toBe(false)
  })

  it('rejects a malformed state', async () => {
    expect((await verifyState('nope', SEED)).ok).toBe(false)
    expect((await verifyState('a.b', SEED)).ok).toBe(false)
    expect((await verifyState('a.b.c.d', SEED)).ok).toBe(false)
  })
})

describe('github buildInstallUrl', () => {
  it('produces a github.com authorize URL with required params', () => {
    const url = buildInstallUrl({
      clientId: 'Iv1.abc',
      state: 'state-string',
      redirectUri: 'https://example.com/api/integrations/github/callback',
    })
    const u = new URL(url)
    expect(u.origin + u.pathname).toBe('https://github.com/login/oauth/authorize')
    expect(u.searchParams.get('client_id')).toBe('Iv1.abc')
    expect(u.searchParams.get('state')).toBe('state-string')
    expect(u.searchParams.get('redirect_uri')).toBe(
      'https://example.com/api/integrations/github/callback',
    )
    expect(u.searchParams.get('scope')).toBe('repo')
  })
})
