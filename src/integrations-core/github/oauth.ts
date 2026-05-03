// GitHub OAuth-App install flow.
//
// Install:  GET /api/integrations/github/install?domain=<d>
//           → 302 to https://github.com/login/oauth/authorize?...
//           state is HMAC-signed `${workspaceId}.${ts}` — same shape
//           as Slack so we can share the helper if we ever need to.
//
// Callback: GET /api/integrations/github/callback?code=...&state=...
//           → verifies state, exchanges code for access token via
//             https://github.com/login/oauth/access_token, fetches
//             /user to grab the login + avatar, encrypts + stores.
//
// We register this as an OAuth App (not a GitHub App). OAuth App
// tokens don't expire and don't need installation handshakes —
// simpler. Trade-off: scopes are coarser (`repo` covers public +
// private). For org-restricted workflows the org admin still has
// to approve the app.

import { hmacSha256Hex, verifyHmacSha256 } from '#/lib/crypto'

const GH_AUTHORIZE_URL = 'https://github.com/login/oauth/authorize'
const GH_TOKEN_URL = 'https://github.com/login/oauth/access_token'
const GH_USER_URL = 'https://api.github.com/user'

// `repo` = full read/write on public + private repos. We need
// write to create issues, and most customers want this on private
// repos too (otherwise public_repo would suffice). Document this
// trade-off on the install card.
const GH_SCOPES = 'repo'

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
  const u = new URL(GH_AUTHORIZE_URL)
  u.searchParams.set('client_id', input.clientId)
  u.searchParams.set('scope', GH_SCOPES)
  u.searchParams.set('state', input.state)
  u.searchParams.set('redirect_uri', input.redirectUri)
  // allow_signup=false would block "create new account" on the
  // GitHub side. Leave it on (default true) — more users complete
  // the install when they're not blocked.
  return u.toString()
}

export type GitHubTokenExchange = {
  ok: true
  accessToken: string
  scope?: string
  login: string
  avatarUrl?: string
}

type GitHubOAuthError = { ok: false; error: string }

export async function exchangeCodeForToken(input: {
  clientId: string
  clientSecret: string
  code: string
  redirectUri: string
}): Promise<GitHubTokenExchange | GitHubOAuthError> {
  const tokenRes = await fetch(GH_TOKEN_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      // Without this, GitHub returns x-www-form-urlencoded and we'd
      // have to URL-decode the response. JSON is cleaner.
      accept: 'application/json',
    },
    body: new URLSearchParams({
      client_id: input.clientId,
      client_secret: input.clientSecret,
      code: input.code,
      redirect_uri: input.redirectUri,
    }),
  })
  const tokenJson = (await tokenRes.json().catch(() => null)) as {
    access_token?: string
    scope?: string
    token_type?: string
    error?: string
    error_description?: string
  } | null
  if (!tokenJson || !tokenJson.access_token) {
    return {
      ok: false,
      error: tokenJson?.error ?? 'github_oauth_failed',
    }
  }

  // Fetch the user's login so the integration row gets a meaningful
  // display name without the operator having to type one in. Failure
  // here doesn't block the install — we fall back to "GitHub".
  let login = 'github-user'
  let avatarUrl: string | undefined
  try {
    const userRes = await fetch(GH_USER_URL, {
      headers: {
        authorization: `Bearer ${tokenJson.access_token}`,
        accept: 'application/vnd.github+json',
        'user-agent': 'FeedbackBot/1.0',
      },
    })
    if (userRes.ok) {
      const u = (await userRes.json()) as {
        login?: string
        avatar_url?: string
      }
      if (u.login) login = u.login
      if (u.avatar_url) avatarUrl = u.avatar_url
    }
  } catch {
    // ignore — we already have the token; the display-name
    // enrichment is best-effort.
  }

  return {
    ok: true,
    accessToken: tokenJson.access_token,
    scope: tokenJson.scope,
    login,
    avatarUrl,
  }
}
