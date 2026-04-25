// Crypto primitives: AES-GCM for integration credentials at rest,
// HMAC-SHA256 for outbound webhook signatures and fingerprint
// tokens, SHA-256 for ip_hash.
//
// Workers runtime provides WebCrypto as `crypto.subtle`.

// ── helpers ──────────────────────────────────────────────────────

const enc = new TextEncoder()
const dec = new TextDecoder()

export function bytesToHex(bytes: Uint8Array): string {
  let out = ''
  for (const b of bytes) out += b.toString(16).padStart(2, '0')
  return out
}

export function bytesToB64(bytes: Uint8Array): string {
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s)
}

export function b64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(b64)
  const out = new Uint8Array(new ArrayBuffer(bin.length))
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

// ── SHA-256 ──────────────────────────────────────────────────────

export async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', enc.encode(input))
  return bytesToHex(new Uint8Array(digest))
}

/**
 * Deterministic IP hash for analytics without retaining raw IPs.
 * Salt rotates daily (seed comes from HMAC_SECRET_SEED + yyyy-mm-dd),
 * so a hash can't be used to correlate across days.
 *
 * Caller is responsible for picking the day salt; this makes salt
 * selection explicit rather than hiding it.
 */
export async function ipHash(ip: string, daySalt: string): Promise<string> {
  return sha256Hex(`${ip}|${daySalt}`)
}

export function daySaltFor(date: Date, masterSeed: string): string {
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  return `${masterSeed}:${y}-${m}-${d}`
}

// ── HMAC-SHA256 ──────────────────────────────────────────────────

async function importHmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  )
}

export async function hmacSha256Hex(
  secret: string,
  message: string,
): Promise<string> {
  const key = await importHmacKey(secret)
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message))
  return bytesToHex(new Uint8Array(sig))
}

export async function verifyHmacSha256(
  secret: string,
  message: string,
  expectedHex: string,
): Promise<boolean> {
  const actual = await hmacSha256Hex(secret, message)
  // Constant-time compare — important for signature verification.
  if (actual.length !== expectedHex.length) return false
  let diff = 0
  for (let i = 0; i < actual.length; i++) {
    diff |= actual.charCodeAt(i) ^ expectedHex.charCodeAt(i)
  }
  return diff === 0
}

// ── HKDF → per-workspace key ─────────────────────────────────────

/**
 * Derive a stable per-workspace AES-GCM key from the master
 * INTEGRATIONS_ENCRYPTION_KEY. We use HKDF-SHA256 with the workspace
 * id as the `info` parameter so every workspace has a unique key
 * while we only need to rotate the master.
 */
export async function deriveWorkspaceKey(
  masterKeyBytes: Uint8Array<ArrayBuffer>,
  workspaceId: string,
): Promise<CryptoKey> {
  const ikm = await crypto.subtle.importKey(
    'raw',
    masterKeyBytes,
    'HKDF',
    false,
    ['deriveKey'],
  )
  return crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: enc.encode('fb:integration-creds:v1'),
      info: enc.encode(workspaceId),
    },
    ikm,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

// ── AES-GCM: encrypt / decrypt JSON credentials ─────────────────

/**
 * Encrypt a JSON-serializable credential blob with the workspace
 * key. Output is `base64(iv) + '.' + base64(ciphertext+tag)` — a
 * single string we can stash in `integrations.credentials`.
 */
export async function encryptCredentials(
  key: CryptoKey,
  plaintext: unknown,
): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(JSON.stringify(plaintext)),
  )
  return `${bytesToB64(iv)}.${bytesToB64(new Uint8Array(ct))}`
}

export async function decryptCredentials<T = unknown>(
  key: CryptoKey,
  blob: string,
): Promise<T> {
  const [ivB64, ctB64] = blob.split('.')
  if (!ivB64 || !ctB64) throw new Error('malformed credential blob')
  const iv = b64ToBytes(ivB64)
  const ct = b64ToBytes(ctB64)
  const pt = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ct,
  )
  return JSON.parse(dec.decode(pt)) as T
}
