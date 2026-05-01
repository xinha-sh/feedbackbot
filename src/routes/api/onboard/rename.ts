// POST /api/onboard/rename
// Rename a placeholder workspace to the user's real domain after
// payment. Also renames the Better Auth organization so the dashboard
// URL (/dashboard/<domain>) matches the org slug.
//
// Body: { workspace_id: string, domain: string }
//
// Auth: caller must be a member of the workspace's org (anonymous
// sessions allowed — we identify by membership, not email).

import { createFileRoute } from '@tanstack/react-router'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'

import { env } from '#/env'
import { makeDb } from '#/db/client'
import {
  comments,
  member,
  organization as orgTable,
  tickets,
  votes,
  workspaces,
} from '#/db/schema'
import { newId } from '#/db/ids'
import { normalizeDomain } from '#/lib/domain'
import {
  ApiError,
  apiError,
  corsHeadersFor,
  json,
  optionsResponse,
} from '#/lib/http'
import { withRequestMetrics } from '#/lib/analytics'
import { requireSession } from '#/lib/admin-auth'
import { writeAudit } from '#/db/client'

const RenameSchema = z.object({
  workspace_id: z.string().min(1),
  domain: z.string().min(3).max(253),
})

async function handle(request: Request): Promise<Response> {
  const cors = corsHeadersFor(request)
  try {
    const body = RenameSchema.safeParse(
      await request.json().catch(() => null),
    )
    if (!body.success) throw new ApiError(400, 'bad body', 'bad_body')
    const domain = normalizeDomain(body.data.domain)
    if (!domain) throw new ApiError(400, 'bad domain', 'bad_domain')

    const { userId } = await requireSession(request)
    const db = makeDb(env.DB)

    // Find the workspace.
    const rows = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, body.data.workspace_id))
      .limit(1)
    const ws = rows[0]
    if (!ws) throw new ApiError(404, 'no workspace', 'no_workspace')
    if (ws.state !== 'pending') {
      throw new ApiError(
        409,
        'workspace already claimed',
        'already_claimed',
      )
    }
    if (!ws.betterAuthOrgId) {
      throw new ApiError(409, 'no org attached', 'no_org')
    }

    // Caller must be a member of this workspace's org.
    const memberships = await db
      .select()
      .from(member)
      .where(
        and(
          eq(member.organizationId, ws.betterAuthOrgId),
          eq(member.userId, userId),
        ),
      )
      .limit(1)
    if (memberships.length === 0) {
      throw new ApiError(403, 'not a member', 'not_member')
    }

    // Uniqueness check + orphan auto-merge.
    //
    // The widget snippet on a customer's site can land before the
    // customer pays — the auto-create-on-first-/api/ticket path
    // creates an unclaimed, unsubscribed pending workspace keyed
    // by their origin domain. When that customer later signs up
    // and tries to link the same domain to their paid workspace,
    // the lookup hits the orphan and would 409 without this merge.
    //
    // Merge rule: an existing workspace at this domain is safe to
    // absorb iff it has NO subscription_id AND state='pending'.
    // Anything else is a real, paying customer's claim — keep the
    // 409.
    const existing = await db
      .select({
        id: workspaces.id,
        state: workspaces.state,
        subscriptionId: workspaces.subscriptionId,
        ticketCount: workspaces.ticketCount,
      })
      .from(workspaces)
      .where(eq(workspaces.domain, domain))
      .limit(1)
    if (existing.length > 0 && existing[0]!.id !== ws.id) {
      const orphan = existing[0]!
      const isOrphan =
        orphan.state === 'pending' && !orphan.subscriptionId
      if (!isOrphan) {
        throw new ApiError(409, 'domain already in use', 'domain_taken')
      }
      // Merge: re-parent any tickets/comments/votes the orphan
      // collected onto the caller's workspace, bump the caller's
      // ticket_count by the orphan's, then delete the orphan.
      // Done in a batch so partial failure leaves the orphan in
      // place rather than orphaning the orphan's children.
      await db.batch([
        db
          .update(tickets)
          .set({ workspaceId: ws.id })
          .where(eq(tickets.workspaceId, orphan.id)),
        db
          .update(comments)
          .set({ workspaceId: ws.id })
          .where(eq(comments.workspaceId, orphan.id)),
        db
          .update(votes)
          .set({ workspaceId: ws.id })
          .where(eq(votes.workspaceId, orphan.id)),
        db
          .update(workspaces)
          .set({
            ticketCount: ws.ticketCount + orphan.ticketCount,
          })
          .where(eq(workspaces.id, ws.id)),
        db.delete(workspaces).where(eq(workspaces.id, orphan.id)),
      ])
      await writeAudit(db, {
        workspaceId: ws.id,
        action: 'workspace.merge.orphan',
        actorUserId: userId,
        metadata: {
          domain,
          merged_workspace_id: orphan.id,
          merged_ticket_count: orphan.ticketCount,
        },
      })
    }

    const newToken = newId.verificationToken()
    await db
      .update(workspaces)
      .set({ domain, verificationToken: newToken })
      .where(eq(workspaces.id, ws.id))

    // Rename the org to match the new domain. Slug uniqueness handled
    // by the organization table's UNIQUE(slug) constraint — if it
    // collides (extremely unlikely), surface the error.
    try {
      await db
        .update(orgTable)
        .set({ name: domain, slug: domain })
        .where(eq(orgTable.id, ws.betterAuthOrgId))
    } catch (err) {
      throw new ApiError(
        409,
        `org rename failed: ${(err as Error).message}`,
        'org_rename_failed',
      )
    }

    await writeAudit(db, {
      workspaceId: ws.id,
      action: 'workspace.rename',
      actorUserId: userId,
      metadata: { from: ws.domain, to: domain },
    })

    return json(
      {
        workspace_id: ws.id,
        domain,
        verification_token: newToken,
        record_name: `_feedback.${domain}`,
        record_value: `feedback-verify=${newToken}`,
      },
      { headers: cors },
    )
  } catch (err) {
    const res = apiError(err)
    for (const [k, v] of Object.entries(cors)) res.headers.set(k, v)
    return res
  }
}

const onboardRename = withRequestMetrics('/api/onboard/rename', handle)

export const Route = createFileRoute('/api/onboard/rename')({
  server: {
    handlers: {
      OPTIONS: ({ request }) => optionsResponse(request),
      POST: async ({ request }) => onboardRename(request),
    },
  },
})
