// PUT /api/screenshot-upload?key=<r2-key>&t=<hmac-token>
// Accepts an image PNG body (< 2 MB) and writes to R2. Token is
// minted by /api/ticket; expires in 10 min.

import { createFileRoute } from '@tanstack/react-router'

import { env } from '#/env'
import {
  ApiError,
  apiError,
  corsHeadersFor,
  json,
  optionsResponse,
} from '#/lib/http'
import { verifyScreenshotToken } from '#/lib/screenshot-token'

const MAX_SIZE_BYTES = 2 * 1024 * 1024 // 2 MB

async function handle(request: Request): Promise<Response> {
  const cors = corsHeadersFor(request)
  try {
    const url = new URL(request.url)
    const key = url.searchParams.get('key')
    const token = url.searchParams.get('t')
    if (!key || !token) throw new ApiError(400, 'missing key or token', 'bad_token')

    const ok = await verifyScreenshotToken(
      env.HMAC_SECRET_SEED,
      'put',
      key,
      token,
    )
    if (!ok) throw new ApiError(403, 'invalid token', 'bad_token')

    const ct = request.headers.get('content-type') ?? ''
    if (!ct.startsWith('image/png') && !ct.startsWith('image/jpeg')) {
      throw new ApiError(415, 'only image/png|jpeg', 'bad_type')
    }

    const body = await request.arrayBuffer()
    if (body.byteLength === 0) throw new ApiError(400, 'empty body', 'empty')
    if (body.byteLength > MAX_SIZE_BYTES) {
      throw new ApiError(413, 'too large', 'too_large')
    }

    await env.SCREENSHOTS.put(key, body, {
      httpMetadata: { contentType: ct },
    })

    return json({ ok: true, key }, { headers: cors })
  } catch (err) {
    const res = apiError(err)
    for (const [k, v] of Object.entries(cors)) res.headers.set(k, v)
    return res
  }
}

export const Route = createFileRoute('/api/screenshot-upload')({
  server: {
    handlers: {
      OPTIONS: ({ request }) => optionsResponse(request),
      PUT: async ({ request }) => handle(request),
    },
  },
})
