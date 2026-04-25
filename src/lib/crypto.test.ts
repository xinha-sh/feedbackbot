import { describe, expect, it } from 'vitest'
import {
  b64ToBytes,
  bytesToB64,
  bytesToHex,
  daySaltFor,
  decryptCredentials,
  deriveWorkspaceKey,
  encryptCredentials,
  hmacSha256Hex,
  ipHash,
  sha256Hex,
  verifyHmacSha256,
} from './crypto'

const MASTER_KEY = new Uint8Array(
  Array.from({ length: 32 }, (_, i) => (i * 7 + 3) & 0xff),
)

describe('bytesToHex', () => {
  it('encodes bytes consistently', () => {
    expect(bytesToHex(new Uint8Array([0, 15, 255]))).toBe('000fff')
  })
})

describe('b64 round-trip', () => {
  it('round-trips', () => {
    const bytes = new Uint8Array([1, 2, 3, 255, 128, 0, 77])
    const round = b64ToBytes(bytesToB64(bytes))
    expect(Array.from(round)).toEqual(Array.from(bytes))
  })
})

describe('sha256Hex + ipHash', () => {
  it('is deterministic for the same input', async () => {
    const a = await sha256Hex('hello')
    const b = await sha256Hex('hello')
    expect(a).toBe(b)
    expect(a).toHaveLength(64)
  })

  it('ipHash differs across days', async () => {
    const today = new Date('2026-04-22T10:00:00Z')
    const tomorrow = new Date('2026-04-23T10:00:00Z')
    const s1 = daySaltFor(today, 'seed')
    const s2 = daySaltFor(tomorrow, 'seed')
    const h1 = await ipHash('1.2.3.4', s1)
    const h2 = await ipHash('1.2.3.4', s2)
    expect(h1).not.toBe(h2)
  })
})

describe('HMAC', () => {
  it('round-trips sign + verify', async () => {
    const sig = await hmacSha256Hex('secret', 'hello')
    expect(await verifyHmacSha256('secret', 'hello', sig)).toBe(true)
    expect(await verifyHmacSha256('secret', 'tampered', sig)).toBe(false)
    expect(await verifyHmacSha256('wrong-secret', 'hello', sig)).toBe(false)
  })

  it('verify is constant-time-safe for length mismatch', async () => {
    expect(await verifyHmacSha256('s', 'm', 'short')).toBe(false)
  })
})

describe('credential encryption', () => {
  it('round-trips a JSON blob', async () => {
    const key = await deriveWorkspaceKey(MASTER_KEY, 'ws_abc')
    const plaintext = { kind: 'slack', token: 'xoxb-123' }
    const blob = await encryptCredentials(key, plaintext)
    expect(blob).toContain('.')
    const decoded = await decryptCredentials<typeof plaintext>(key, blob)
    expect(decoded).toEqual(plaintext)
  })

  it('different workspaces get different keys', async () => {
    const k1 = await deriveWorkspaceKey(MASTER_KEY, 'ws_one')
    const k2 = await deriveWorkspaceKey(MASTER_KEY, 'ws_two')
    const blob = await encryptCredentials(k1, { a: 1 })
    // k2 should fail to decrypt k1's blob
    await expect(decryptCredentials(k2, blob)).rejects.toBeDefined()
  })
})
