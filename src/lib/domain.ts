import { parse } from 'tldts'

/**
 * Normalize a hostname to its public-suffix registrable domain
 * (eTLD+1). Returns null if the input is empty, an IP, or can't be
 * parsed (e.g. `localhost`).
 *
 *   normalizeDomain('https://www.Example.co.uk/path') -> 'example.co.uk'
 *   normalizeDomain('sub.example.com')                -> 'example.com'
 *   normalizeDomain('127.0.0.1')                      -> null
 */
export function normalizeDomain(input: string | null | undefined): string | null {
  if (!input) return null
  const parsed = parse(input)
  if (!parsed.domain) return null
  if (parsed.isIp) return null
  return parsed.domain.toLowerCase()
}

/**
 * Pull the registrable domain out of an Origin or Referer header.
 * Both are absolute URLs; we pass the whole string to tldts which
 * handles scheme + path.
 */
export function domainFromHeader(
  origin: string | null,
  referer: string | null,
): string | null {
  return normalizeDomain(origin) ?? normalizeDomain(referer)
}

/**
 * Check whether two hostnames share the same registrable domain.
 * Used by the email-match claim path: a user with email
 * alice@eng.acme.com can claim workspace for acme.com.
 */
export function sameRegistrableDomain(a: string, b: string): boolean {
  const na = normalizeDomain(a)
  const nb = normalizeDomain(b)
  return na !== null && na === nb
}
