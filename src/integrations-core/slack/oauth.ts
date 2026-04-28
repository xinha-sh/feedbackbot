// Slack OAuth v2 install flow.
//
// Install:  GET /api/integrations/slack/install?domain=<d>
//           → 302 to https://slack.com/oauth/v2/authorize?...
//           state is HMAC-signed `${workspaceId}.${ts}`
//
// Callback: GET /api/integrations/slack/callback?code=...&state=...
//           → verifies state, exchanges code for bot token via
//             https://slack.com/api/oauth.v2.access, encrypts with
//             the workspace key, inserts as integration.
//           → 302 to /dashboard/<domain>/integrations

import { hmacSha256Hex, verifyHmacSha256 } from '#/lib/crypto'

const SLACK_AUTHORIZE_URL = 'https://slack.com/oauth/v2/authorize'
const SLACK_OAUTH_ACCESS_URL = 'https://slack.com/api/oauth.v2.access'

// Bot-only scopes, enough for chat.postMessage + channel discovery.
// We deliberately avoid the user_scope surface.
const SLACK_BOT_SCOPES = [
  'chat:write',
  'chat:write.public',
  'channels:read',
  'groups:read',
].join(',')

const STATE_TTL_MS = 10 * 60 * 1000 // 10 min

export async function mintState(
  workspaceId: string,
  hmacSeed: string,
): Promise<string> {
  const ts = Date.now()
  const payload = `${workspaceId}.${ts}`
  const sig = await hmacSha256Hex(hmacSeed, payload)
  return `${payload}.${sig}`
}

export async function verifyState(
  state: string,
  hmacSeed: string,
): Promise<{ ok: boolean; workspaceId?: string }> {
  const parts = state.split('.')
  if (parts.length !== 3) return { ok: false }
  const [workspaceId, tsStr, sig] = parts
  if (!workspaceId || !tsStr || !sig) return { ok: false }
  const ts = Number(tsStr)
  if (!Number.isFinite(ts) || Date.now() - ts > STATE_TTL_MS) {
    return { ok: false }
  }
  const valid = await verifyHmacSha256(hmacSeed, `${workspaceId}.${tsStr}`, sig)
  if (!valid) return { ok: false }
  return { ok: true, workspaceId }
}

export function buildInstallUrl(input: {
  clientId: string
  state: string
  redirectUri: string
}): string {
  const u = new URL(SLACK_AUTHORIZE_URL)
  u.searchParams.set('client_id', input.clientId)
  u.searchParams.set('scope', SLACK_BOT_SCOPES)
  u.searchParams.set('state', input.state)
  u.searchParams.set('redirect_uri', input.redirectUri)
  return u.toString()
}

export type SlackTokenExchange = {
  ok: true
  accessToken: string
  teamId: string
  teamName?: string
  botUserId?: string
  scope?: string
}

type SlackOAuthError = { ok: false; error: string }

export async function exchangeCodeForToken(input: {
  clientId: string
  clientSecret: string
  code: string
  redirectUri: string
}): Promise<SlackTokenExchange | SlackOAuthError> {
  const body = new URLSearchParams({
    client_id: input.clientId,
    client_secret: input.clientSecret,
    code: input.code,
    redirect_uri: input.redirectUri,
  })
  const res = await fetch(SLACK_OAUTH_ACCESS_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
    },
    body,
  })
  const json = (await res.json().catch(() => null)) as {
    ok?: boolean
    error?: string
    access_token?: string
    scope?: string
    bot_user_id?: string
    team?: { id?: string; name?: string }
  } | null
  if (!json || json.ok !== true || !json.access_token || !json.team?.id) {
    return { ok: false, error: json?.error ?? 'slack_oauth_failed' }
  }
  return {
    ok: true,
    accessToken: json.access_token,
    teamId: json.team.id,
    teamName: json.team.name,
    botUserId: json.bot_user_id,
    scope: json.scope,
  }
}
