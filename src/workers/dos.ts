// Dedicated Worker that hosts the three DO classes. Main app worker
// binds the DO namespaces via scriptName → this worker.
//
// Cloudflare requires a `fetch` handler on any Worker script; we
// never route traffic here directly, but provide a stub so the
// script is valid.

export { RateLimiter } from '#/do/rate-limiter'
export { WorkspaceLimiter } from '#/do/workspace-limiter'
export { ClaimLock } from '#/do/claim-lock'

export default {
  fetch(_request: Request): Response {
    return new Response('DO host — no HTTP handlers', { status: 404 })
  },
} satisfies ExportedHandler
