// GET /api/integrations/slack/callback?code=...&state=...
// Slack redirects here after the user authorizes. We verify state,
// exchange the code for a bot token, encrypt, store as an
// integration row, then redirect to the dashboard.

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
} from '#/integrations-core/slack/oauth'

function installPageRedirect(
  domain: string,
  status: 'installed' | 'error',
  opts: { reason?: string; integrationId?: string } = {},
) {
  const q = new URLSearchParams({ slack: status })
  if (opts.reason) q.set('reason', opts.reason)
  if (opts.integrationId) q.set('integration', opts.integrationId)
  const target = `/dashboard/${encodeURIComponent(domain)}/integrations?${q}`
  return Response.redirect(new URL(target, 'https://usefeedbackbot.com').toString(), 302)
}

async function handle(request: Request): Promise<Response> {
  const cors = corsHeadersFor(request)
  try {
    const url = new URL(request.url)
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state')
    const slackError = url.searchParams.get('error')

    if (slackError) return installPageRedirect('', 'error', { reason: slackError })
    if (!code || !state) return installPageRedirect('', 'error', { reason: 'missing_params' })

    const stateCheck = await verifyState(state, env.HMAC_SECRET_SEED)
    if (!stateCheck.ok || !stateCheck.workspaceId) {
      return installPageRedirect('', 'error', { reason: 'bad_state' })
    }

    const db = makeDb(env.DB)
    const workspace = await getWorkspaceById(db, stateCheck.workspaceId)
    if (!workspace) {
      return installPageRedirect('', 'error', { reason: 'no_workspace' })
    }

    if (!env.SLACK_CLIENT_ID || !env.SLACK_CLIENT_SECRET) {
      return installPageRedirect(workspace.domain, 'error', { reason: 'not_configured' })
    }

    const redirectUri = `${url.origin}/api/integrations/slack/callback`
    const exchange = await exchangeCodeForToken({
      clientId: env.SLACK_CLIENT_ID,
      clientSecret: env.SLACK_CLIENT_SECRET,
      code,
      redirectUri,
    })
    if (!exchange.ok) {
      return installPageRedirect(workspace.domain, 'error', { reason: exchange.error })
    }

    const masterKey = b64ToBytes(env.INTEGRATIONS_ENCRYPTION_KEY)
    const wsKey = await deriveWorkspaceKey(masterKey, workspace.id)
    const encrypted = await encryptCredentials(wsKey, {
      kind: 'slack',
      access_token: exchange.accessToken,
      team_id: exchange.teamId,
      team_name: exchange.teamName,
    })

    const integration = await insertIntegration(db, {
      workspaceId: workspace.id,
      kind: 'slack',
      name: exchange.teamName
        ? `Slack · ${exchange.teamName}`
        : 'Slack workspace',
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

const cb = withRequestMetrics('/api/integrations/slack/callback', handle)

export const Route = createFileRoute('/api/integrations/slack/callback')({
  server: {
    handlers: {
      OPTIONS: ({ request }) => optionsResponse(request),
      GET: async ({ request }) => cb(request),
    },
  },
})
