// GET /api/screenshot/<key>?t=<hmac-token>
// Serves the R2 object behind an HMAC-signed token. Used by
// outbound webhook payloads so integrations can render a preview
// without our R2 being publicly readable.

import { createFileRoute } from '@tanstack/react-router'

import { env } from '#/env'
import {
  ApiError,
  apiError,
  corsHeadersFor,
  optionsResponse,
} from '#/lib/http'
import { verifyScreenshotToken } from '#/lib/screenshot-token'

async function handle(request: Request, key: string): Promise<Response> {
  const cors = corsHeadersFor(request)
  try {
    const url = new URL(request.url)
    const token = url.searchParams.get('t')
    if (!token) throw new ApiError(400, 'missing token', 'bad_token')

    const ok = await verifyScreenshotToken(
      env.HMAC_SECRET_SEED,
      'get',
      key,
      token,
    )
    if (!ok) throw new ApiError(403, 'invalid token', 'bad_token')

    const obj = await env.SCREENSHOTS.get(key)
    if (!obj) throw new ApiError(404, 'not found', 'no_object')

    return new Response(obj.body, {
      status: 200,
      headers: {
        ...cors,
        'content-type':
          obj.httpMetadata?.contentType ?? 'application/octet-stream',
        'cache-control': 'private, max-age=3600',
      },
    })
  } catch (err) {
    const res = apiError(err)
    for (const [k, v] of Object.entries(cors)) res.headers.set(k, v)
    return res
  }
}

export const Route = createFileRoute('/api/screenshot/$key')({
  server: {
    handlers: {
      OPTIONS: ({ request }) => optionsResponse(request),
      GET: async ({ request, params }) => handle(request, params.key),
    },
  },
})
