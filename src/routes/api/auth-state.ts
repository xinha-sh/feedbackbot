// GET /api/auth-state
// Reports which auth methods are wired on this deploy, so the /login
// and /signup pages can hide buttons that wouldn't work. Used by
// preview environments to suppress GitHub OAuth (its callback URL is
// pinned at the prod apex).

import { createFileRoute } from '@tanstack/react-router'

import { env } from '#/env'
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
    return json(
      {
        github_enabled: !!env.GITHUB_CLIENT_ID && !!env.GITHUB_CLIENT_SECRET,
        magic_link_enabled: !!env.UNOSEND_API_KEY,
      },
      { headers: cors },
    )
  } catch (err) {
    const res = apiError(err)
    for (const [k, v] of Object.entries(cors)) res.headers.set(k, v)
    return res
  }
}

const getAuthState = withRequestMetrics('/api/auth-state', handle)

export const Route = createFileRoute('/api/auth-state')({
  server: {
    handlers: {
      OPTIONS: ({ request }) => optionsResponse(request),
      GET: async ({ request }) => getAuthState(request),
    },
  },
})
