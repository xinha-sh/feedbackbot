// Shared "is this user a member of the workspace?" check used by
// every /api/admin/* handler. Centralized so workspace-scoping is
// enforced identically across routes.

import { auth } from '#/lib/auth'
import { ApiError } from '#/lib/http'
import type { Workspace } from '#/db/schema'

export type AdminContext = {
  userId: string
  workspace: Workspace
}

export async function requireAdmin(
  request: Request,
  workspace: Workspace,
): Promise<AdminContext> {
  const session = await auth.api
    .getSession({ headers: request.headers })
    .catch(() => null)
  if (!session?.user) {
    throw new ApiError(401, 'sign in required', 'unauth')
  }
  if (!workspace.betterAuthOrgId) {
    throw new ApiError(403, 'workspace not claimed', 'not_claimed')
  }
  const members = await auth.api
    .listMembers({
      query: { organizationId: workspace.betterAuthOrgId },
      headers: request.headers,
    })
    .catch(() => null)
  const isMember =
    !!members &&
    Array.isArray(members.members) &&
    members.members.some(
      (m: { userId?: string }) => m.userId === session.user.id,
    )
  if (!isMember) {
    throw new ApiError(403, 'not a member', 'not_member')
  }
  return { userId: session.user.id, workspace }
}
