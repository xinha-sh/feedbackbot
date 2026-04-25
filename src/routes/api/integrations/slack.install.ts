// GET /api/integrations/slack/install?domain=<d>
// Admin-only. Mints an HMAC state and 302-redirects to Slack's
// OAuth authorize URL. On success, Slack redirects back to
// /api/integrations/slack/callback.

import { createFileRoute } from '@tanstack/react-router'

import { env } from '#/env'
import { getWorkspaceByDomain, makeDb } from '#/db/client'
import { normalizeDomain } from '#/lib/domain'
import { ApiError, apiError, corsHeadersFor, optionsResponse } from '#/lib/http'
import { withRequestMetrics } from '#/lib/analytics'
import { requireAdmin } from '#/lib/admin-auth'
import { buildInstallUrl, mintState } from '#/integrations-core/slack/oauth'

async function handle(request: Request): Promise<Response> {
  const cors = corsHeadersFor(request)
  try {
    if (!env.SLACK_CLIENT_ID) {
      throw new ApiError(503, 'slack not configured', 'not_configured')
    }
    const url = new URL(request.url)
    const domain = normalizeDomain(url.searchParams.get('domain'))
    if (!domain) throw new ApiError(400, 'bad domain', 'bad_domain')

    const db = makeDb(env.DB)
    const workspace = await getWorkspaceByDomain(db, domain)
    if (!workspace) throw new ApiError(404, 'no workspace', 'no_workspace')
    await requireAdmin(request, workspace)

    const state = await mintState(workspace.id, env.HMAC_SECRET_SEED)
    const redirectUri = `${new URL(request.url).origin}/api/integrations/slack/callback`
    const authorizeUrl = buildInstallUrl({
      clientId: env.SLACK_CLIENT_ID,
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

const install = withRequestMetrics('/api/integrations/slack/install', handle)

export const Route = createFileRoute('/api/integrations/slack/install')({
  server: {
    handlers: {
      OPTIONS: ({ request }) => optionsResponse(request),
      GET: async ({ request }) => install(request),
    },
  },
})
