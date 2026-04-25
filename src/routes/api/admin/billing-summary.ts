// GET /api/admin/billing-summary?domain=<d>
// Returns the workspace's current plan + subscription state for the
// dashboard billing page.

import { createFileRoute } from '@tanstack/react-router'
import { and, eq, gt, sql } from 'drizzle-orm'

import { env } from '#/env'
import { getWorkspaceByDomain, makeDb } from '#/db/client'
import { tickets } from '#/db/schema'
import { normalizeDomain } from '#/lib/domain'
import {
  ApiError,
  apiError,
  corsHeadersFor,
  json,
  optionsResponse,
} from '#/lib/http'
import { withRequestMetrics } from '#/lib/analytics'
import { requireAdmin } from '#/lib/admin-auth'
import { PLAN_LABEL, type PlanId } from '#/lib/billing/plans'
import { entitlementsFor } from '#/lib/billing/entitlements'

async function handle(request: Request): Promise<Response> {
  const cors = corsHeadersFor(request)
  try {
    const url = new URL(request.url)
    const domain = normalizeDomain(url.searchParams.get('domain'))
    if (!domain) throw new ApiError(400, 'bad domain', 'bad_domain')
    const db = makeDb(env.DB)
    const workspace = await getWorkspaceByDomain(db, domain)
    if (!workspace) throw new ApiError(404, 'no workspace', 'no_workspace')
    await requireAdmin(request, workspace)

    const plan = (workspace.plan as PlanId) ?? 'free'
    const ent = entitlementsFor(plan)

    // Tickets created in the trailing 30 days, used to show
    // "X / monthly_ticket_cap used" on the dashboard.
    const sinceMs = Date.now() - 30 * 24 * 60 * 60 * 1000
    const monthlyRow = await db
      .select({ count: sql<number>`count(*)` })
      .from(tickets)
      .where(
        and(
          eq(tickets.workspaceId, workspace.id),
          gt(tickets.createdAt, sinceMs),
        ),
      )
    const monthlyUsed = Number(monthlyRow[0]?.count ?? 0)

    return json(
      {
        workspace_id: workspace.id,
        plan,
        plan_label: PLAN_LABEL[plan] ?? 'Free',
        subscription_id: workspace.subscriptionId,
        subscription_status: workspace.subscriptionStatus,
        current_period_end: workspace.currentPeriodEnd,
        billing_enabled: !!env.DODO_PAYMENTS_API_KEY,
        entitlements: {
          monthly_ticket_cap: ent.monthly_ticket_cap,
          hourly_burst: ent.hourly_burst,
          max_seats: ent.max_seats,
          max_integrations: ent.max_integrations,
          remove_branding: ent.remove_branding,
          sso_enabled: ent.sso_enabled,
          audit_log_export: ent.audit_log_export,
          api_access: ent.api_access,
        },
        usage: {
          monthly_tickets_used: monthlyUsed,
          monthly_tickets_remaining: Math.max(
            ent.monthly_ticket_cap - monthlyUsed,
            0,
          ),
        },
      },
      { headers: cors },
    )
  } catch (err) {
    const res = apiError(err)
    for (const [k, v] of Object.entries(cors)) res.headers.set(k, v)
    return res
  }
}

const getBillingSummary = withRequestMetrics(
  '/api/admin/billing-summary',
  handle,
)

export const Route = createFileRoute('/api/admin/billing-summary')({
  server: {
    handlers: {
      OPTIONS: ({ request }) => optionsResponse(request),
      GET: async ({ request }) => getBillingSummary(request),
    },
  },
})
