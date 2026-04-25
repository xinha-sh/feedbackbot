import { describe, expect, it } from 'vitest'
import {
  mintScreenshotToken,
  verifyScreenshotToken,
} from './screenshot-token'

const SECRET = 'test-secret'

describe('screenshot tokens', () => {
  it('round-trips a put token', async () => {
    const key = 'ws_abc/tkt_xyz.png'
    const token = await mintScreenshotToken(SECRET, 'put', key)
    expect(await verifyScreenshotToken(SECRET, 'put', key, token)).toBe(true)
  })

  it('rejects a token minted for a different op', async () => {
    const key = 'ws_abc/tkt_xyz.png'
    const token = await mintScreenshotToken(SECRET, 'put', key)
    expect(await verifyScreenshotToken(SECRET, 'get', key, token)).toBe(false)
  })

  it('rejects a token minted for a different key', async () => {
    const token = await mintScreenshotToken(SECRET, 'put', 'ws_1/a.png')
    expect(await verifyScreenshotToken(SECRET, 'put', 'ws_1/b.png', token)).toBe(
      false,
    )
  })

  it('rejects a token with a tampered signature', async () => {
    const key = 'ws_abc/tkt_xyz.png'
    const token = await mintScreenshotToken(SECRET, 'put', key)
    const tampered = token.slice(0, -1) + (token.slice(-1) === '0' ? '1' : '0')
    expect(await verifyScreenshotToken(SECRET, 'put', key, tampered)).toBe(false)
  })

  it('rejects a token with a different secret', async () => {
    const key = 'ws_abc/tkt_xyz.png'
    const token = await mintScreenshotToken(SECRET, 'put', key)
    expect(await verifyScreenshotToken('other-secret', 'put', key, token)).toBe(
      false,
    )
  })

  it('rejects an expired token', async () => {
    // Forge an expired token by hand using the same hash routine
    const key = 'k.png'
    const exp = Date.now() - 1000
    const { hmacSha256Hex } = await import('./crypto')
    const sig = await hmacSha256Hex(SECRET, `${exp}|put|${key}`)
    const token = `${exp}.put.${encodeURIComponent(key)}.${sig}`
    expect(await verifyScreenshotToken(SECRET, 'put', key, token)).toBe(false)
  })

  it('survives keys with slashes and dots', async () => {
    const key = 'ws_a.b/tkt_c.d/shot.png'
    const token = await mintScreenshotToken(SECRET, 'get', key)
    expect(await verifyScreenshotToken(SECRET, 'get', key, token)).toBe(true)
  })
})
