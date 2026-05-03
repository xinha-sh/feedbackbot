// GET /api/integrations/github/install?domain=<d>
// Admin-only. Mints HMAC state and 302-redirects to GitHub's
// authorize URL. On success, GitHub redirects back to
// /api/integrations/github/callback.

import { createFileRoute } from '@tanstack/react-router'

import { env } from '#/env'
import { ApiError, apiError, corsHeadersFor, optionsResponse } from '#/lib/http'
import { withRequestMetrics } from '#/lib/analytics'
import { requireAdminWorkspace } from '#/lib/admin-auth'
import { buildInstallUrl, mintState } from '#/integrations-core/github/oauth'

async function handle(request: Request): Promise<Response> {
  const cors = corsHeadersFor(request)
  try {
    if (!env.GITHUB_CLIENT_ID) {
      throw new ApiError(503, 'github not configured', 'not_configured')
    }
    const { workspace } = await requireAdminWorkspace(request)

    const state = await mintState(workspace.id, env.HMAC_SECRET_SEED)
    const redirectUri = `${new URL(request.url).origin}/api/integrations/github/callback`
    const authorizeUrl = buildInstallUrl({
      clientId: env.GITHUB_CLIENT_ID,
      state,
      redirectUri,
    })
    return Response.redirect(authorizeUrl, 302)
  } catch (err) {
    const res = apiError(err)
    for (const [k, v] of Object.entries(cors)) res.headers.set(k, v)
    return res
  }
}

const install = withRequestMetrics('/api/integrations/github/install', handle)

export const Route = createFileRoute('/api/integrations/github/install')({
  server: {
    handlers: {
      OPTIONS: ({ request }) => optionsResponse(request),
      GET: async ({ request }) => install(request),
    },
  },
})
