// Single source of truth for plan-gated limits + feature flags.
// Read everywhere a feature might depend on the workspace's plan:
//   - WorkspaceLimiter (monthly + hourly caps)
//   - integrations create endpoint (max_integrations)
//   - widget bootstrap (remove_branding)
//   - admin invite endpoint, when it lands (max_seats)
//   - SSO / API gates (sso_enabled, api_access)
//
// Numeric limits use Number.POSITIVE_INFINITY for "unlimited".

import type { PlanId } from '#/lib/billing/plans'

export type Entitlements = {
  /** Hard ceiling on tickets per calendar month. */
  monthly_ticket_cap: number
  /** Cap on tickets while the workspace is still in `pending` state. */
  pending_ticket_cap: number
  /** Burst rate, tickets per rolling hour. */
  hourly_burst: number
  /** Max admin seats (Better Auth org members). */
  max_seats: number
  /** Max active integrations on the workspace. */
  max_integrations: number
  /** When false, the widget renders a "Powered by FeedbackBot" line. */
  remove_branding: boolean
  /** SSO sign-in (SAML / OIDC) shown in admin UI. */
  sso_enabled: boolean
  /** Admin can export the workspace audit log. */
  audit_log_export: boolean
  /** Public REST API access for the workspace. */
  api_access: boolean
}

// `free` is the locked / post-cancellation state. Limits are tight
// on purpose — there's no public free tier any more, so the only way
// a workspace ends up here is when a paid subscription was cancelled
// or expired. Read-only-ish: the widget still loads (so end users
// aren't stranded), but the workspace cannot accept new tickets.
const FREE: Entitlements = {
  monthly_ticket_cap: 0,
  pending_ticket_cap: 0,
  hourly_burst: 0,
  max_seats: 1,
  max_integrations: 0,
  remove_branding: false,
  sso_enabled: false,
  audit_log_export: false,
  api_access: false,
}

// $1/mo entry plan. Charging anything stops automated spam-signup
// farms cold (bots optimize for $0). Limits are intentionally close
// to what an old free tier would have.
const LITE: Entitlements = {
  monthly_ticket_cap: 100,
  pending_ticket_cap: 100,
  hourly_burst: 100,
  max_seats: 1,
  max_integrations: 1,
  remove_branding: false,
  sso_enabled: false,
  audit_log_export: false,
  api_access: false,
}

const STARTER: Entitlements = {
  monthly_ticket_cap: 1_000,
  pending_ticket_cap: 100,
  hourly_burst: 1_000,
  max_seats: 3,
  max_integrations: 2,
  remove_branding: true,
  sso_enabled: false,
  audit_log_export: false,
  api_access: false,
}

const SCALE: Entitlements = {
  monthly_ticket_cap: 10_000,
  pending_ticket_cap: 100,
  hourly_burst: 10_000,
  max_seats: 10,
  // Soft "unlimited"; rejection above this is a smoke signal something
  // is mis-wired (we don't intend to charge for unlimited integrations
  // operationally).
  max_integrations: 100,
  remove_branding: true,
  sso_enabled: true,
  audit_log_export: true,
  api_access: true,
}

const TABLE: Record<PlanId, Entitlements> = {
  free: FREE,
  lite: LITE,
  starter: STARTER,
  scale: SCALE,
}

export function entitlementsFor(plan: PlanId | string | null | undefined): Entitlements {
  if (plan && plan in TABLE) return TABLE[plan as PlanId]
  return FREE
}
