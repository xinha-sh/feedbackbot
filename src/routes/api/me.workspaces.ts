// GET /api/me/workspaces
// Returns the set of claimed workspaces the current session's user is
// a member of. Used by /login to redirect signed-in users directly
// to their billing page when they arrive with a ?plan= intent.

import { createFileRoute } from '@tanstack/react-router'
import { eq, inArray } from 'drizzle-orm'

import { env } from '#/env'
import { auth } from '#/lib/auth'
import { makeDb } from '#/db/client'
import { member, workspaces } from '#/db/schema'
import {
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
      return json(
        { signed_in: false, user: null, workspaces: [] },
        { headers: cors },
      )
    }
    const user = session.user as {
      id: string
      email: string
      isAnonymous?: boolean
    }
    const userOut = {
      id: user.id,
      email: user.email,
      is_anonymous: user.isAnonymous ?? false,
    }
    const db = makeDb(env.DB)
    const memberships = await db
      .select({ organizationId: member.organizationId })
      .from(member)
      .where(eq(member.userId, session.user.id))
    const orgIds = memberships.map((m) => m.organizationId)
    if (orgIds.length === 0) {
      return json(
        { signed_in: true, user: userOut, workspaces: [] },
        { headers: cors },
      )
    }
    const ws = await db
      .select({
        id: workspaces.id,
        domain: workspaces.domain,
        plan: workspaces.plan,
        state: workspaces.state,
        subscription_id: workspaces.subscriptionId,
        subscription_status: workspaces.subscriptionStatus,
      })
      .from(workspaces)
      .where(inArray(workspaces.betterAuthOrgId, orgIds))
    return json(
      { signed_in: true, user: userOut, workspaces: ws },
      { headers: cors },
    )
  } catch (err) {
    const res = apiError(err)
    for (const [k, v] of Object.entries(cors)) res.headers.set(k, v)
    return res
  }
}

const getMyWorkspaces = withRequestMetrics('/api/me/workspaces', handle)

export const Route = createFileRoute('/api/me/workspaces')({
  server: {
    handlers: {
      OPTIONS: ({ request }) => optionsResponse(request),
      GET: async ({ request }) => getMyWorkspaces(request),
    },
  },
})
