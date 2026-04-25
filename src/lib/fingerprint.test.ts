import { describe, expect, it } from 'vitest'
import { newAnonCookieId, voteFingerprint } from './fingerprint'

describe('voteFingerprint', () => {
  it('is deterministic for the same inputs', async () => {
    const a = await voteFingerprint({
      cookieId: 'abc',
      ipHash: 'hash1',
      hmacSeed: 'seed',
    })
    const b = await voteFingerprint({
      cookieId: 'abc',
      ipHash: 'hash1',
      hmacSeed: 'seed',
    })
    expect(a).toBe(b)
    expect(a).toHaveLength(64)
  })

  it('changes if cookieId, ipHash, or seed differ', async () => {
    const base = await voteFingerprint({
      cookieId: 'c',
      ipHash: 'i',
      hmacSeed: 's',
    })
    expect(
      await voteFingerprint({ cookieId: 'c2', ipHash: 'i', hmacSeed: 's' }),
    ).not.toBe(base)
    expect(
      await voteFingerprint({ cookieId: 'c', ipHash: 'i2', hmacSeed: 's' }),
    ).not.toBe(base)
    expect(
      await voteFingerprint({ cookieId: 'c', ipHash: 'i', hmacSeed: 's2' }),
    ).not.toBe(base)
  })
})

describe('newAnonCookieId', () => {
  it('returns a 32-char hex string', () => {
    const id = newAnonCookieId()
    expect(id).toMatch(/^[0-9a-f]{32}$/)
  })
  it('returns distinct values', () => {
    const ids = new Set(Array.from({ length: 20 }, () => newAnonCookieId()))
    expect(ids.size).toBe(20)
  })
})
