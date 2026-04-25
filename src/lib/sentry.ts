import * as Sentry from '@sentry/cloudflare'
import type { Env } from '#/env'

// Shared Sentry options builder. Returns undefined when DSN isn't
// set so `withSentry` no-ops in local dev.
export function sentryOptions(env: Env) {
  if (!env.SENTRY_DSN) return undefined
  return {
    dsn: env.SENTRY_DSN,
    tracesSampleRate: 0.1,
    environment: 'production',
  }
}

export { Sentry }
export const withSentry = Sentry.withSentry
