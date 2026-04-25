import { createFileRoute } from '@tanstack/react-router'

import { env } from '#/env'
import { getWorkspaceByDomain, listPublicTickets, makeDb } from '#/db/client'
import { normalizeDomain } from '#/lib/domain'
import {
  ApiError,
  apiError,
  corsHeadersFor,
  json,
  optionsResponse,
} from '#/lib/http'
import { withRequestMetrics } from '#/lib/analytics'

const CACHE_TTL_SECONDS = 30

const getList = withRequestMetrics('/api/public/tickets', handleList)

export const Route = createFileRoute('/api/public/tickets')({
  server: {
    handlers: {
      OPTIONS: ({ request }) => optionsResponse(request),
      GET: async ({ request }) => getList(request),
    },
  },
})

async function handleList(request: Request): Promise<Response> {
  const cors = corsHeadersFor(request)
  try {
    const url = new URL(request.url)
    const rawDomain = url.searchParams.get('domain')
    const domain = normalizeDomain(rawDomain)
    if (!domain) throw new ApiError(400, 'missing ?domain', 'bad_domain')

    // Short-TTL cache hit.
    const cacheKey = `pub:tickets:${domain}`
    const cached = await env.CACHE_KV.get(cacheKey)
    if (cached) {
      return json(JSON.parse(cached), {
        headers: { ...cors, 'cache-control': `public, max-age=${CACHE_TTL_SECONDS}` },
      })
    }

    const db = makeDb(env.DB)
    const workspace = await getWorkspaceByDomain(db, domain)
    if (!workspace) throw new ApiError(404, 'no workspace', 'no_workspace')
    if (workspace.state !== 'claimed') {
      // Public board only visible after claim.
      throw new ApiError(403, 'board not public', 'not_public')
    }

    const tickets = await listPublicTickets(db, workspace.id)

    // Narrow projection — never expose ip_hash, email, or
    // classification_meta reasoning to the public board.
    const payload = {
      workspace: { domain: workspace.domain },
      tickets: tickets.map((t) => ({
        id: t.id,
        message: t.message,
        status: t.status,
        classification: t.classification,
        suggested_title: safeTitle(t.classificationMeta),
        upvotes: t.upvotes,
        created_at: t.createdAt,
      })),
    }

    await env.CACHE_KV.put(cacheKey, JSON.stringify(payload), {
      expirationTtl: CACHE_TTL_SECONDS,
    })

    return json(payload, {
      headers: { ...cors, 'cache-control': `public, max-age=${CACHE_TTL_SECONDS}` },
    })
  } catch (err) {
    const res = apiError(err)
    for (const [k, v] of Object.entries(cors)) res.headers.set(k, v)
    return res
  }
}

function safeTitle(metaJson: string | null): string | null {
  if (!metaJson) return null
  try {
    const parsed = JSON.parse(metaJson) as { suggested_title?: unknown }
    return typeof parsed.suggested_title === 'string' ? parsed.suggested_title : null
  } catch {
    return null
  }
}
