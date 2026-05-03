// GET /api/integrations/github/callback?code=...&state=...
// GitHub redirects here after the user authorizes. We verify state,
// exchange the code for an access token, fetch the user's login +
// avatar, encrypt + store, then redirect to the dashboard with a
// success/error banner.

import { createFileRoute } from '@tanstack/react-router'

import { env } from '#/env'
import {
  getWorkspaceById,
  insertIntegration,
  makeDb,
} from '#/db/client'
import {
  b64ToBytes,
  deriveWorkspaceKey,
  encryptCredentials,
} from '#/lib/crypto'
import { apiError, corsHeadersFor, optionsResponse } from '#/lib/http'
import { withRequestMetrics } from '#/lib/analytics'
import {
  exchangeCodeForToken,
  verifyState,
} from '#/integrations-core/github/oauth'

function installPageRedirect(
  domain: string,
  status: 'installed' | 'error',
  opts: { reason?: string; integrationId?: string } = {},
) {
  const q = new URLSearchParams({ github: status })
  if (opts.reason) q.set('reason', opts.reason)
  if (opts.integrationId) q.set('integration', opts.integrationId)
  const target = `/dashboard/${encodeURIComponent(domain)}/integrations?${q}`
  return Response.redirect(
    new URL(target, 'https://usefeedbackbot.com').toString(),
    302,
  )
}

async function handle(request: Request): Promise<Response> {
  const cors = corsHeadersFor(request)
  try {
    const url = new URL(request.url)
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state')
    const ghError = url.searchParams.get('error')

    if (ghError) return installPageRedirect('', 'error', { reason: ghError })
    if (!code || !state)
      return installPageRedirect('', 'error', { reason: 'missing_params' })

    const stateCheck = await verifyState(state, env.HMAC_SECRET_SEED)
    if (!stateCheck.ok || !stateCheck.workspaceId) {
      return installPageRedirect('', 'error', { reason: 'bad_state' })
    }

    const db = makeDb(env.DB)
    const workspace = await getWorkspaceById(db, stateCheck.workspaceId)
    if (!workspace) {
      return installPageRedirect('', 'error', { reason: 'no_workspace' })
    }

    if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
      return installPageRedirect(workspace.domain, 'error', {
        reason: 'not_configured',
      })
    }

    const redirectUri = `${url.origin}/api/integrations/github/callback`
    const exchange = await exchangeCodeForToken({
      clientId: env.GITHUB_CLIENT_ID,
      clientSecret: env.GITHUB_CLIENT_SECRET,
      code,
      redirectUri,
    })
    if (!exchange.ok) {
      return installPageRedirect(workspace.domain, 'error', {
        reason: exchange.error,
      })
    }

    const masterKey = b64ToBytes(env.INTEGRATIONS_ENCRYPTION_KEY)
    const wsKey = await deriveWorkspaceKey(masterKey, workspace.id)
    const encrypted = await encryptCredentials(wsKey, {
      kind: 'github',
      access_token: exchange.accessToken,
      login: exchange.login,
      avatar_url: exchange.avatarUrl,
      scope: exchange.scope,
    })

    const integration = await insertIntegration(db, {
      workspaceId: workspace.id,
      kind: 'github',
      name: `GitHub · ${exchange.login}`,
      encryptedCredentials: encrypted,
    })

    return installPageRedirect(workspace.domain, 'installed', {
      integrationId: integration.id,
    })
  } catch (err) {
    const res = apiError(err)
    for (const [k, v] of Object.entries(cors)) res.headers.set(k, v)
    return res
  }
}

const cb = withRequestMetrics('/api/integrations/github/callback', handle)

export const Route = createFileRoute('/api/integrations/github/callback')({
  server: {
    handlers: {
      OPTIONS: ({ request }) => optionsResponse(request),
      GET: async ({ request }) => cb(request),
    },
  },
})
