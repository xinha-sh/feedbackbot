// POST /api/signup/abandon
// Deletes the current (anonymous) user's placeholder workspaces and
// their orgs if nothing has been paid for. Used by /signup to let
// users start fresh if they bailed mid-flow.
//
// Safety: we only delete workspaces where
//   state = 'pending'
//   plan = 'free'
//   subscription_id IS NULL
//   domain ends with '.feedbackbot.internal'
// A paid workspace is never deleted here.

import { createFileRoute } from '@tanstack/react-router'
import { and, eq, isNull, like } from 'drizzle-orm'

import { env } from '#/env'
import { auth } from '#/lib/auth'
import { makeDb } from '#/db/client'
import {
  member,
  organization as orgTable,
  workspaces,
} from '#/db/schema'
import {
  ApiError,
  apiError,
  corsHeadersFor,
  json,
  optionsResponse,
} from '#/lib/http'
import { withRequestMetrics } from '#/lib/analytics'

async function handle(request: Request): Promise<Response> {
  const cors = corsHeadersFor(request)
  try {
    const session = await auth.api
      .getSession({ headers: request.headers })
      .catch(() => null)
    if (!session?.user) {
      throw new ApiError(401, 'no session', 'no_session')
    }

    const db = makeDb(env.DB)
    const memberships = await db
      .select({ organizationId: member.organizationId })
      .from(member)
      .where(eq(member.userId, session.user.id))

    const deletedIds: Array<string> = []
    for (const m of memberships) {
      const rows = await db
        .select()
        .from(workspaces)
        .where(
          and(
            eq(workspaces.betterAuthOrgId, m.organizationId),
            eq(workspaces.state, 'pending'),
            eq(workspaces.plan, 'free'),
            isNull(workspaces.subscriptionId),
            like(workspaces.domain, '%.feedbackbot.internal'),
          ),
        )
      for (const ws of rows) {
        await db.delete(workspaces).where(eq(workspaces.id, ws.id))
        deletedIds.push(ws.id)
      }
      // Also delete the empty org + membership rows so a future
      // signup doesn't pile up orphan orgs.
      await db.delete(member).where(eq(member.organizationId, m.organizationId))
      await db.delete(orgTable).where(eq(orgTable.id, m.organizationId))
    }

    return json(
      { deleted: deletedIds.length, workspace_ids: deletedIds },
      { headers: cors },
    )
  } catch (err) {
    const res = apiError(err)
    for (const [k, v] of Object.entries(cors)) res.headers.set(k, v)
    return res
  }
}

const abandon = withRequestMetrics('/api/signup/abandon', handle)

export const Route = createFileRoute('/api/signup/abandon')({
  server: {
    handlers: {
      OPTIONS: ({ request }) => optionsResponse(request),
      POST: async ({ request }) => abandon(request),
    },
  },
})
