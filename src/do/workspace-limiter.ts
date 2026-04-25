// Per-workspace rate limiter + monthly + pending caps. Plan-aware:
// the caller passes the workspace's plan (and the lifetime ticket
// totals it already knows from the workspaces row) and we apply the
// matching limits from src/lib/billing/entitlements.ts.

import { entitlementsFor } from '#/lib/billing/entitlements'

const HOUR_MS = 60 * 60 * 1000
const MONTH_MS = 30 * 24 * 60 * 60 * 1000

export type WorkspaceCheckInput = {
  state: 'pending' | 'claimed' | 'suspended'
  plan: string
  /** Lifetime ticket total on the workspace row (used for pending cap). */
  currentTotal: number
}

export type WorkspaceCheckResult = {
  allowed: boolean
  reason?: 'hourly' | 'pending_cap' | 'suspended' | 'monthly'
  hourly_remaining: number
  monthly_remaining: number
}

export class WorkspaceLimiter {
  private timestamps: Array<number> = []
  private loaded = false

  constructor(private state: DurableObjectState) {}

  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url)
    if (url.pathname === '/check' && req.method === 'POST') {
      const body = (await req.json()) as WorkspaceCheckInput
      return Response.json(await this.check(body))
    }
    return new Response('not found', { status: 404 })
  }

  private async load() {
    if (this.loaded) return
    const stored = await this.state.storage.get<Array<number>>('ts')
    this.timestamps = stored ?? []
    this.loaded = true
  }

  private async check(
    input: WorkspaceCheckInput,
  ): Promise<WorkspaceCheckResult> {
    await this.load()

    const ent = entitlementsFor(input.plan)
    const hourlyLimit = ent.hourly_burst
    const monthlyLimit = ent.monthly_ticket_cap

    if (input.state === 'suspended') {
      return {
        allowed: false,
        reason: 'suspended',
        hourly_remaining: 0,
        monthly_remaining: 0,
      }
    }

    if (
      input.state === 'pending' &&
      input.currentTotal >= ent.pending_ticket_cap
    ) {
      return {
        allowed: false,
        reason: 'pending_cap',
        hourly_remaining: 0,
        monthly_remaining: 0,
      }
    }

    const now = Date.now()
    // Trim history to the last 30 days; we keep the same array for
    // both hourly + monthly windows since monthly is the longer span.
    this.timestamps = this.timestamps.filter((t) => t > now - MONTH_MS)

    const hourlyUsed = this.timestamps.filter((t) => t > now - HOUR_MS).length
    if (hourlyUsed >= hourlyLimit) {
      return {
        allowed: false,
        reason: 'hourly',
        hourly_remaining: 0,
        monthly_remaining: Math.max(monthlyLimit - this.timestamps.length, 0),
      }
    }

    const monthlyUsed = this.timestamps.length
    if (monthlyUsed >= monthlyLimit) {
      return {
        allowed: false,
        reason: 'monthly',
        hourly_remaining: Math.max(hourlyLimit - hourlyUsed, 0),
        monthly_remaining: 0,
      }
    }

    this.timestamps.push(now)
    await this.state.storage.put('ts', this.timestamps)
    // Wake up after the hourly window so we can prune. The monthly
    // window is large enough that we don't need a separate alarm —
    // the next request prunes anything past 30d.
    await this.state.storage.setAlarm(now + HOUR_MS + 60_000)

    return {
      allowed: true,
      hourly_remaining: hourlyLimit - hourlyUsed - 1,
      monthly_remaining: monthlyLimit - monthlyUsed - 1,
    }
  }

  async alarm() {
    await this.load()
    const cutoff = Date.now() - MONTH_MS
    this.timestamps = this.timestamps.filter((t) => t > cutoff)
    if (this.timestamps.length === 0) {
      await this.state.storage.deleteAll()
    } else {
      await this.state.storage.put('ts', this.timestamps)
    }
  }
}

export async function checkWorkspaceRate(
  ns: DurableObjectNamespace,
  workspaceId: string,
  input: WorkspaceCheckInput,
): Promise<WorkspaceCheckResult> {
  const id = ns.idFromName(workspaceId)
  const stub = ns.get(id)
  const res = await stub.fetch('https://wsl/check', {
    method: 'POST',
    body: JSON.stringify(input),
  })
  return res.json()
}
