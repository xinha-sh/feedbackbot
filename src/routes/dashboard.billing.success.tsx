import { createFileRoute, useSearch } from '@tanstack/react-router'
import { useEffect } from 'react'

import { seoMeta } from '#/lib/seo'

export const Route = createFileRoute('/dashboard/billing/success')({
  component: BillingSuccess,
  validateSearch: (raw: Record<string, unknown>) => ({
    workspace_id:
      typeof raw.workspace_id === 'string'
        ? (raw.workspace_id as string)
        : undefined,
    status:
      typeof raw.status === 'string' ? (raw.status as string) : undefined,
  }),
  head: () => ({
    meta: seoMeta({
      path: '/dashboard/billing/success',
      title: 'Finishing up',
      noindex: true,
    }),
  }),
})

// Dodo redirects here after checkout. We just hand off to the
// onboarding state machine at /onboard/:id, which decides the next
// step (enter domain, secure account, verify DNS, or show "payment
// failed") based on workspace + session state.
function BillingSuccess() {
  const search = useSearch({ from: '/dashboard/billing/success' })
  const workspaceId = search.workspace_id
  const status = search.status

  useEffect(() => {
    if (!workspaceId) {
      window.location.replace('/')
      return
    }
    const failed = status && status !== 'active' && status !== 'succeeded'
    const qs = failed ? `?failed=${encodeURIComponent(status!)}` : ''
    window.location.replace(`/onboard/${workspaceId}${qs}`)
  }, [workspaceId, status])

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: 24,
        color: 'var(--fg-mute)',
        fontSize: 13,
      }}
    >
      Finishing up…
    </div>
  )
}
