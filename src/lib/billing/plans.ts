// Single source of truth for the plan catalogue. Slug is what the
// Dodo product carries; PlanId is our internal enum; productId is
// the Dodo product primary key. The checkout plugin in auth.ts and
// the server-side POST /api/signup/start-checkout both read this map.
//
// `free` is reserved for the post-cancellation / locked state — there
// is no public free tier. The smallest paid tier is `lite` ($1/mo).

export type PlanId = 'free' | 'lite' | 'starter' | 'scale'

export const SLUG_TO_PLAN: Record<string, PlanId> = {
  'feedbackbot-lite': 'lite',
  'feedbackbot-starter': 'starter',
  'feedbackbot-scale': 'scale',
}

export const PLAN_LABEL: Record<PlanId, string> = {
  free: 'Locked',
  lite: 'Lite',
  starter: 'Starter',
  scale: 'Scale',
}

// Dodo product ids (test mode). See DECISIONS.md 2026-04-24/2026-04-25.
export const PLAN_PRODUCTS: Array<{ slug: string; productId: string }> = [
  { slug: 'feedbackbot-lite', productId: 'pdt_0NdRpkVc0SEz3JvRfDphZ' },
  { slug: 'feedbackbot-starter', productId: 'pdt_0NdNiXopUStGE5cemK9PG' },
  { slug: 'feedbackbot-scale', productId: 'pdt_0NdNiXttlTeFfTwrGujIy' },
]

export function productIdForPlan(planId: PlanId): string | null {
  const slug = Object.entries(SLUG_TO_PLAN).find(([, id]) => id === planId)?.[0]
  if (!slug) return null
  return PLAN_PRODUCTS.find((p) => p.slug === slug)?.productId ?? null
}

export function planFromSlug(slug: string | null | undefined): PlanId {
  if (!slug) return 'free'
  return SLUG_TO_PLAN[slug] ?? 'free'
}
