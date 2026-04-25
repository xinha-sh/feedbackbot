// Daily cron. Runs the analytics rollup and the abandoned-anonymous-
// user sweep (see DECISIONS.md 2026-04-24). Triggered by a Cloudflare
// Cron Trigger (configured in alchemy.run.ts). Separate worker so the
// cron failure can't take down the app.

import { and, eq, inArray, isNotNull, lt, ne, or, sql } from 'drizzle-orm'
import { makeDb } from '#/db/client'
import {
  member,
  organization,
  tickets,
  user,
  workspaces,
} from '#/db/schema'
import type { Env } from '#/env'
import { sentryOptions, withSentry } from '#/lib/sentry'

const ANON_TTL_DAYS = 3

const handler: ExportedHandler<Env> = {
  async scheduled(_controller, env) {
    const db = makeDb(env.DB)
    const since = Date.now() - 24 * 60 * 60 * 1000

    // Per-workspace counts for the trailing 24h.
    const rows = await db
      .select({
        workspaceId: tickets.workspaceId,
        total: sql<number>`count(*)`,
        bugs: sql<number>`sum(case when ${tickets.classification} = 'bug' then 1 else 0 end)`,
        features: sql<number>`sum(case when ${tickets.classification} = 'feature' then 1 else 0 end)`,
        queries: sql<number>`sum(case when ${tickets.classification} = 'query' then 1 else 0 end)`,
        spam: sql<number>`sum(case when ${tickets.classification} = 'spam' then 1 else 0 end)`,
      })
      .from(tickets)
      .where(sql`${tickets.createdAt} > ${since}`)
      .groupBy(tickets.workspaceId)

    const today = new Date()
    const day = `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, '0')}-${String(today.getUTCDate()).padStart(2, '0')}`

    await Promise.all(
      rows.map((r) =>
        env.ANALYTICS_KV.put(
          `stats:${r.workspaceId}:${day}`,
          JSON.stringify({
            tickets: Number(r.total),
            by_type: {
              bug: Number(r.bugs),
              feature: Number(r.features),
              query: Number(r.queries),
              spam: Number(r.spam),
            },
          }),
          { expirationTtl: 90 * 24 * 60 * 60 }, // 90d retention
        ),
      ),
    )

    // Sanity log — visible via `wrangler tail`.
    console.log('cron rollup', { workspacesTouched: rows.length, day })

    await sweepAbandonedAnons(db)
  },
}

// Deletes anonymous Better Auth users that have been sitting around
// longer than ANON_TTL_DAYS without linking to a real account. A
// workspace that has been paid for is load-bearing (Dodo subscription
// attaches to it) — we *only* delete orgs where every workspace is
// still free + unpaid, so a forgotten checkout can still be recovered
// by the customer later.
async function sweepAbandonedAnons(db: ReturnType<typeof makeDb>) {
  const cutoff = new Date(Date.now() - ANON_TTL_DAYS * 24 * 60 * 60 * 1000)

  const stale = await db
    .select({ id: user.id })
    .from(user)
    .where(and(eq(user.isAnonymous, true), lt(user.createdAt, cutoff)))

  if (stale.length === 0) {
    console.log('cron anon sweep', { candidates: 0 })
    return
  }

  const userIds = stale.map((u) => u.id)
  const memberships = await db
    .select({ organizationId: member.organizationId, userId: member.userId })
    .from(member)
    .where(inArray(member.userId, userIds))

  const orgIds = Array.from(new Set(memberships.map((m) => m.organizationId)))

  // Find paid orgs — anything with a subscription or non-free plan.
  // We leave those (and their owner) alone so the customer can still
  // link the account.
  const paidOrgs =
    orgIds.length > 0
      ? await db
          .select({ orgId: workspaces.betterAuthOrgId })
          .from(workspaces)
          .where(
            and(
              inArray(workspaces.betterAuthOrgId, orgIds),
              or(
                isNotNull(workspaces.subscriptionId),
                ne(workspaces.plan, 'free'),
              ),
            ),
          )
      : []
  const paidOrgIds = new Set(
    paidOrgs.map((p) => p.orgId).filter((id): id is string => !!id),
  )

  const deletableUserIds: Array<string> = []
  const deletableOrgIds: Array<string> = []
  for (const id of userIds) {
    const myOrgs = memberships
      .filter((m) => m.userId === id)
      .map((m) => m.organizationId)
    const hasPaid = myOrgs.some((o) => paidOrgIds.has(o))
    if (hasPaid) continue
    deletableUserIds.push(id)
    for (const o of myOrgs) {
      if (!deletableOrgIds.includes(o)) deletableOrgIds.push(o)
    }
  }

  if (deletableOrgIds.length > 0) {
    // Workspaces have no FK on `better_auth_org_id`, so they don't
    // cascade — drop them manually first.
    await db
      .delete(workspaces)
      .where(inArray(workspaces.betterAuthOrgId, deletableOrgIds))
    // Organization delete cascades member rows.
    await db
      .delete(organization)
      .where(inArray(organization.id, deletableOrgIds))
  }
  if (deletableUserIds.length > 0) {
    // User delete cascades session + account + any remaining member
    // rows (e.g. orgs with no workspaces).
    await db.delete(user).where(inArray(user.id, deletableUserIds))
  }

  console.log('cron anon sweep', {
    candidates: userIds.length,
    skipped_paid: userIds.length - deletableUserIds.length,
    deleted_users: deletableUserIds.length,
    deleted_orgs: deletableOrgIds.length,
  })
}

export default withSentry(sentryOptions, handler)
