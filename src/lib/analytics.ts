// Analytics Engine thin wrapper. Per-request emit + daily rollup
// read shape per PLAN.md §12. Writes are fire-and-forget — Analytics
// Engine queues them internally.

import { env } from '#/env'

export type RequestEvent = {
  route: string
  status: number
  durationMs: number
  workspaceId?: string
}

/**
 * Record a per-request event. Safe to call from any route handler.
 * Silently no-ops if the binding is unset (local dev without AE).
 */
export function emitRequest(event: RequestEvent): void {
  if (!env.ANALYTICS) return
  try {
    env.ANALYTICS.writeDataPoint({
      blobs: [event.route, event.workspaceId ?? ''],
      doubles: [event.status, event.durationMs],
      indexes: event.workspaceId ? [event.workspaceId] : undefined,
    })
  } catch (err) {
    // never fail a request because analytics emit failed
    console.warn('analytics emit failed', err)
  }
}

/**
 * Wrap a route handler so response status + duration are emitted to
 * Analytics Engine automatically. Handler can take any arg list as
 * long as the first is the Request.
 */
export function withRequestMetrics<A extends [Request, ...Array<unknown>]>(
  routeName: string,
  handler: (...args: A) => Promise<Response>,
): (...args: A) => Promise<Response> {
  return async (...args) => {
    const start = Date.now()
    let status = 500
    try {
      const res = await handler(...args)
      status = res.status
      return res
    } finally {
      emitRequest({
        route: routeName,
        status,
        durationMs: Date.now() - start,
      })
    }
  }
}
