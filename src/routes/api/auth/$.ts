import { createFileRoute } from '@tanstack/react-router'
import { auth } from '#/lib/auth'

async function handle(request: Request): Promise<Response> {
  try {
    return await auth.handler(request)
  } catch (err) {
    // Better Auth wraps a lot of internal failures in a generic
    // HTTPError — log the full stack server-side so wrangler tail
    // shows something useful.
    console.error('auth handler threw', {
      path: new URL(request.url).pathname,
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
      cause: err instanceof Error ? err.cause : undefined,
    })
    throw err
  }
}

export const Route = createFileRoute('/api/auth/$')({
  server: {
    handlers: {
      GET: ({ request }) => handle(request),
      POST: ({ request }) => handle(request),
    },
  },
})
