import { createFileRoute } from '@tanstack/react-router'
import { auth } from '#/lib/auth'

async function handle(request: Request): Promise<Response> {
  const path = new URL(request.url).pathname
  try {
    return await auth.handler(request)
  } catch (err) {
    // Better Auth wraps a lot of internal failures in a generic
    // HTTPError — log the full stack server-side so wrangler tail
    // shows something useful.
    console.error('auth handler threw', {
      path,
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
      cause: err instanceof Error ? err.cause : undefined,
    })
    // Return a plain-text 500 the client can show in a toast. The
    // login form reads the response body as the error message; an
    // unhandled throw here would surface as a Vinxi/TSS HTML error
    // page that we'd display verbatim.
    const message = path.includes('/sign-in/magic-link')
      ? "Couldn't send the sign-in email. Please try again, or contact support@usefeedbackbot.com if it keeps failing."
      : 'Authentication failed. Please try again.'
    return new Response(message, {
      status: 500,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    })
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
