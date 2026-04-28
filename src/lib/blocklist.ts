// Membership checks against BLOCKLIST_KV. Seeded at deploy time
// (Task #9). Short per-check caching via CACHE_KV keeps this
// near-free even at peak traffic.

type BlocklistBucket = 'freemail' | 'disposable' | 'strict'

async function isInBlocklist(
  kv: KVNamespace,
  bucket: BlocklistBucket,
  domain: string,
): Promise<boolean> {
  const v = await kv.get(`${bucket}:${domain}`)
  return v !== null
}

export async function isFreemail(kv: KVNamespace, domain: string) {
  return isInBlocklist(kv, 'freemail', domain)
}

async function isDisposable(kv: KVNamespace, domain: string) {
  return isInBlocklist(kv, 'disposable', domain)
}

export async function isStrict(kv: KVNamespace, domain: string) {
  return isInBlocklist(kv, 'strict', domain)
}

/**
 * Reject ingestion if the origin domain is freemail or disposable.
 * Strict domains (edu/gov/mil) are *allowed to submit*, but blocked
 * from the email-match claim path — that's enforced separately.
 */
export async function shouldBlockIngestionDomain(
  kv: KVNamespace,
  domain: string,
): Promise<boolean> {
  const [free, disp] = await Promise.all([
    isFreemail(kv, domain),
    isDisposable(kv, domain),
  ])
  return free || disp
}
