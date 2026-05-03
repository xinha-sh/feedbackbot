// Shared queryOptions for queries that more than one route reads,
// so the route loader and the component's useQuery share an identical
// queryKey + queryFn (the SSR-query integration in src/router.tsx
// uses this to hydrate the cache during navigation, making
// route-to-route transitions instant when the cache is warm).
//
// Per-route queries can stay inlined in their route file — only put
// them here when ≥2 routes need them.

import { queryOptions } from '@tanstack/react-query'

import type { WorkspaceStateResponse } from '#/schema/claim'
import type { PlanId } from '#/lib/billing/plans'

export type BillingSummary = {
  workspace_id: string
  plan: PlanId
  plan_label: string
  subscription_id: string | null
  subscription_status: string | null
  current_period_end: number | null
  billing_enabled: boolean
  entitlements: {
    monthly_ticket_cap: number
    hourly_burst: number
    max_seats: number
    max_integrations: number
    remove_branding: boolean
    sso_enabled: boolean
    audit_log_export: boolean
    api_access: boolean
  }
  usage: {
    monthly_tickets_used: number
    monthly_tickets_remaining: number
  }
}

export const workspaceStateQuery = (domain: string) =>
  queryOptions({
    queryKey: ['workspace-state', domain],
    queryFn: async (): Promise<WorkspaceStateResponse> => {
      const res = await fetch(
        `/api/workspace-state?domain=${encodeURIComponent(domain)}`,
        { credentials: 'include' },
      )
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json()
    },
  })

export const billingSummaryQuery = (domain: string) =>
  queryOptions({
    queryKey: ['billing-summary', domain],
    queryFn: async (): Promise<BillingSummary> => {
      const res = await fetch(
        `/api/admin/billing-summary?domain=${encodeURIComponent(domain)}`,
        { credentials: 'include' },
      )
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json()
    },
  })
