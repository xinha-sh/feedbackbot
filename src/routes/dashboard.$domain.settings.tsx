import { createFileRoute } from '@tanstack/react-router'

import { Slab } from '#/components/ui/brut'

export const Route = createFileRoute('/dashboard/$domain/settings')({
  component: Settings,
})

function Settings() {
  const { domain } = Route.useParams() as { domain: string }
  return (
    <div style={{ maxWidth: 720 }}>
      <Slab num="04" right={domain}>
        Settings
      </Slab>
      <p style={{ color: 'var(--fg-mute)' }}>
        Workspace-level settings land here: public-board visibility, data
        retention, transfer-ownership, deletion. Deferred for MVP.
      </p>
    </div>
  )
}
