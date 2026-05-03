// POST /api/admin/tickets/:id/classify?domain=<d>
//
// Re-enqueues the ticket onto CLASSIFY_QUEUE so the worker takes
// another pass. Used by the "Retry classification" button when
// the AI run failed (classification is NULL after queue retries
// exhausted) or when the operator wants a re-run after a model
// upgrade.
//
// Side effect: nukes the prior classification + classificationMeta
// so the ticket re-enters the "pending classification" state in
// the UI while the queue runs. If the worker still fails, the
// fields stay NULL and the manual override path is the way out.

import { createFileRoute } from '@tanstack/react-router'
import { and, eq } from 'drizzle-orm'

import { env } from '#/env'
import { tickets } from '#/db/schema'
import { getTicket } from '#/db/client'
import {
  ApiError,
  apiError,
  corsHeadersFor,
  json,
  optionsResponse,
} from '#/lib/http'
import { withRequestMetrics } from '#/lib/analytics'
import { requireAdminWorkspace } from '#/lib/admin-auth'

async function handle(request: Request, ticketId: string): Promise<Response> {
  const cors = corsHeadersFor(request)
  try {
    const { workspace, db } = await requireAdminWorkspace(request)
    const ticket = await getTicket(db, workspace.id, ticketId)
    if (!ticket) throw new ApiError(404, 'no ticket', 'no_ticket')

    // Reset classification so the UI shows "pending classification"
    // until the worker finishes. Keep status and other fields.
    await db
      .update(tickets)
      .set({
        classification: null,
        classificationMeta: null,
        updatedAt: Date.now(),
      })
      .where(
        and(eq(tickets.workspaceId, workspace.id), eq(tickets.id, ticket.id)),
      )

    await env.CLASSIFY_QUEUE.send({
      ticket_id: ticket.id,
      workspace_id: workspace.id,
    })

    return json({ ok: true }, { headers: cors })
  } catch (err) {
    const res = apiError(err)
    for (const [k, v] of Object.entries(cors)) res.headers.set(k, v)
    return res
  }
}

const reclassify = withRequestMetrics(
  '/api/admin/tickets/:id/classify',
  handle,
)

export const Route = createFileRoute('/api/admin/tickets/$id/classify')({
  server: {
    handlers: {
      OPTIONS: ({ request }) => optionsResponse(request),
      POST: async ({ request, params }) =>
        reclassify(request as Request, params.id),
    },
  },
})
