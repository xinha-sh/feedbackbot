// HMAC-signed screenshot tokens. We don't use R2's S3-compat
// presigning (which needs S3 credentials) — instead our own Worker
// validates a token bound to (op, key, exp) and streams to/from R2
// on the caller's behalf.
//
// Token format (URL-safe):
//   <exp>.<op>.<key>.<sig>
//   sig = hmac_sha256(secret, `${exp}|${op}|${key}`)

import { hmacSha256Hex, verifyHmacSha256 } from './crypto'

export type Op = 'put' | 'get'

const UPLOAD_TTL_MS = 10 * 60 * 1000 // 10 min
const DOWNLOAD_TTL_MS = 60 * 60 * 1000 // 1 h

export async function mintScreenshotToken(
  secret: string,
  op: Op,
  key: string,
): Promise<string> {
  const exp = Date.now() + (op === 'put' ? UPLOAD_TTL_MS : DOWNLOAD_TTL_MS)
  const sig = await hmacSha256Hex(secret, `${exp}|${op}|${key}`)
  // encode key so it survives a query-string round-trip
  return `${exp}.${op}.${encodeURIComponent(key)}.${sig}`
}

export async function verifyScreenshotToken(
  secret: string,
  op: Op,
  key: string,
  token: string,
): Promise<boolean> {
  const parts = token.split('.')
  if (parts.length < 4) return false
  // sig is always the last segment; everything between part[2] and
  // the sig belongs to the (encoded) key but split('.') is fine
  // because our encodeURIComponent escapes dots inside the key.
  const [expStr, tokOp, encKey, ...rest] = parts
  if (!expStr || !tokOp || !encKey || rest.length === 0) return false
  const sig = rest.pop()!
  const maybeKeyTail = rest.join('.')
  const reassembledKey = maybeKeyTail
    ? decodeURIComponent(`${encKey}.${maybeKeyTail}`)
    : decodeURIComponent(encKey)

  if (tokOp !== op) return false
  if (reassembledKey !== key) return false
  const exp = Number(expStr)
  if (!Number.isFinite(exp) || exp < Date.now()) return false
  return verifyHmacSha256(secret, `${exp}|${op}|${key}`, sig)
}

export function buildUploadUrl(origin: string, key: string, token: string): string {
  const u = new URL('/api/screenshot-upload', origin)
  u.searchParams.set('key', key)
  u.searchParams.set('t', token)
  return u.toString()
}

export function buildGetUrl(origin: string, key: string, token: string): string {
  const u = new URL(`/api/screenshot/${encodeURIComponent(key)}`, origin)
  u.searchParams.set('t', token)
  return u.toString()
}
