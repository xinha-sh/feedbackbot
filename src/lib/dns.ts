// DoH lookup for DNS TXT verification. Uses Cloudflare's public
// resolver (1.1.1.1) over HTTPS per PLAN.md §11.
//
// Record layout (DECISIONS.md 2026-04-22 #5):
//   _feedback.<domain>   TXT   "feedback-verify=<token>"

export const VERIFY_RECORD_PREFIX = '_feedback'
export const VERIFY_VALUE_PREFIX = 'feedback-verify='

export function verifyRecordName(domain: string) {
  return `${VERIFY_RECORD_PREFIX}.${domain}`
}

export function verifyRecordValue(token: string) {
  return `${VERIFY_VALUE_PREFIX}${token}`
}

type DohResponse = {
  Status: number
  Answer?: Array<{ name: string; type: number; TTL: number; data: string }>
}

/**
 * Query DoH for TXT records on `_feedback.<domain>` and return the
 * raw values (strings). Stripped of their enclosing quotes.
 */
export async function lookupVerificationTxt(
  domain: string,
): Promise<Array<string>> {
  const url = new URL('https://1.1.1.1/dns-query')
  url.searchParams.set('name', verifyRecordName(domain))
  url.searchParams.set('type', 'TXT')
  const res = await fetch(url, { headers: { accept: 'application/dns-json' } })
  if (!res.ok) return []
  const body = (await res.json()) as DohResponse
  if (body.Status !== 0 || !body.Answer) return []
  return body.Answer
    .filter((a) => a.type === 16) // TXT
    .map((a) => stripTxtQuoting(a.data))
}

function stripTxtQuoting(raw: string): string {
  // DoH returns TXT strings wrapped in double quotes; long TXT
  // records come as concatenated quoted segments.
  return raw
    .split(/\s+/)
    .map((chunk) => {
      if (chunk.startsWith('"') && chunk.endsWith('"')) return chunk.slice(1, -1)
      return chunk
    })
    .join('')
}

/**
 * True iff any TXT value on `_feedback.<domain>` matches the exact
 * expected `feedback-verify=<token>` string.
 */
export async function verifyDomainTxt(
  domain: string,
  token: string,
): Promise<{ verified: boolean; found: Array<string> }> {
  const values = await lookupVerificationTxt(domain)
  const expected = verifyRecordValue(token)
  return { verified: values.includes(expected), found: values }
}
