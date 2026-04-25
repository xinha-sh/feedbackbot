import { hmacSha256Hex } from './crypto'

// Vote fingerprint: signed-cookie + ip_hash composite, hashed with the
// HMAC seed so nobody can forge one from a leaked DB row.
//
// Caller generates or reads a stable anonymous cookie (set on first
// visit), and passes `ipHash` from lib/crypto.
export async function voteFingerprint(input: {
  cookieId: string
  ipHash: string
  hmacSeed: string
}): Promise<string> {
  return hmacSha256Hex(
    input.hmacSeed,
    `v1|${input.cookieId}|${input.ipHash}`,
  )
}

export const VOTE_COOKIE = 'fb_vid'
export const VOTE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365 // 1y

// Minimal random-id generator for the anonymous cookie. Not
// cryptographic — just distinct-per-browser. Uses nanoid elsewhere.
export function newAnonCookieId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  let hex = ''
  for (const b of bytes) hex += b.toString(16).padStart(2, '0')
  return hex
}
