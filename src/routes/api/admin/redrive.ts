// Redrive endpoint — admin UI hits this to re-enqueue a failed row
// from `fanout-dlq` into `fanout-queue`. PLAN.md §12.
//
// The actual DLQ read is done by a separate Worker (fanout-dlq has
// its own consumer that lists/fetches). For the MVP we let the
// admin pass the ticket_id + workspace_id directly and we re-enqueue.
// A richer UI that lists DLQ rows is a follow-up.

import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

import { env } from '#/env'
import {
  getWorkspaceByDomain,
  makeDb,
} from '#/db/client'
import { normalizeDomain } from '#/lib/domain'
import {
  ApiError,
  apiError,
  corsHeadersFor,
  json,
  optionsResponse,
} from '#/lib/http'
import { withRequestMetrics } from '#/lib/analytics'
import { requireAdmin } from '#/lib/admin-auth'

const RedriveSchema = z.object({
  domain: z.string().min(1),
  ticket_id: z.string().min(1),
})

const postRedrive = withRequestMetrics('/api/admin/redrive', handle)

export const Route = createFileRoute('/api/admin/redrive')({
  server: {
    handlers: {
      OPTIONS: ({ request }) => optionsResponse(request),
      POST: async ({ request }) => postRedrive(request),
    },
  },
})

async function handle(request: Request): Promise<Response> {
  const cors = corsHeadersFor(request)
  try {
    const body = RedriveSchema.safeParse(await request.json().catch(() => null))
    if (!body.success) throw new ApiError(400, 'bad body', 'bad_body')

    const domain = normalizeDomain(body.data.domain)
    if (!domain) throw new ApiError(400, 'bad domain', 'bad_domain')

    const db = makeDb(env.DB)
    const workspace = await getWorkspaceByDomain(db, domain)
    if (!workspace) throw new ApiError(404, 'no workspace', 'no_workspace')
    await requireAdmin(request, workspace)

    await env.FANOUT_QUEUE.send({
      ticket_id: body.data.ticket_id,
      workspace_id: workspace.id,
      attempt: 0,
    })

    return json({ ok: true }, { headers: cors })
  } catch (err) {
    const res = apiError(err)
    for (const [k, v] of Object.entries(cors)) res.headers.set(k, v)
    return res
  }
}
