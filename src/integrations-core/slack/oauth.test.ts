import { describe, expect, it } from 'vitest'
import { mintState, verifyState } from './oauth'

const SEED = 'test-seed'

describe('slack OAuth state', () => {
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
