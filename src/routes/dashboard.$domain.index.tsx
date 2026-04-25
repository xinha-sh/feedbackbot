import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'

import { AdminTicketRow } from './dashboard.$domain'
import { Slab, Chip, Btn } from '#/components/ui/brut'
import type { ClassificationKind, TicketStatus } from '#/schema/ticket'

type AdminTicket = {
  id: string
  message: string
  status: TicketStatus
  classification: ClassificationKind | null
  classificationMeta: string | null
  upvotes: number
  createdAt: number
  pageUrl: string | null
}

export const Route = createFileRoute('/dashboard/$domain/')({
  component: Tickets,
})

function Tickets() {
  const { domain } = Route.useParams() as { domain: string }
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-tickets', domain],
    queryFn: async () => {
      const res = await fetch(
        `/api/admin/tickets?domain=${encodeURIComponent(domain)}`,
        { credentials: 'include' },
      )
      if (res.status === 401) throw new Error('sign in required')
      if (res.status === 403) throw new Error('not a member of this workspace')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return (await res.json()) as { tickets: Array<AdminTicket> }
    },
  })

  return (
    <div>
      <Slab num="01" right={`workspace: ${domain}`}>
        Tickets
      </Slab>

      <div
        style={{
          display: 'flex',
          gap: 10,
          marginBottom: 20,
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <Chip accent>{data?.tickets.length ?? 0} total</Chip>
        <Chip>all statuses</Chip>
        <Chip>all kinds</Chip>
        <div style={{ flex: 1 }} />
        <Btn size="sm">Export CSV</Btn>
      </div>

      {isLoading && (
        <div className="h-mono" style={{ color: 'var(--fg-mute)', fontSize: 13 }}>
          Loading tickets…
        </div>
      )}
      {error && (
        <div
          className="hi-card"
          style={{
            padding: 20,
            background: 'color-mix(in oklch, var(--danger) 8%, transparent)',
            borderColor: 'var(--danger)',
          }}
        >
          <strong>Couldn't load tickets.</strong>
          <div style={{ fontSize: 13, marginTop: 6 }}>
            {(error as Error).message}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {data?.tickets.map((t) => {
          const kindMap: Partial<
            Record<ClassificationKind, 'bug' | 'feat' | 'query' | 'spam'>
          > = {
            bug: 'bug',
            feature: 'feat',
            query: 'query',
            spam: 'spam',
          }
          const meta = t.classificationMeta
            ? (safeParse(t.classificationMeta) as {
                suggested_title?: string
              } | null)
            : null
          return (
            <Link
              key={t.id}
              to="/dashboard/$domain/tickets/$id"
              params={{ domain, id: t.id }}
              style={{ textDecoration: 'none' }}
            >
              <AdminTicketRow
                title={meta?.suggested_title ?? t.message.slice(0, 80)}
                message={t.message}
                tagKind={t.classification ? kindMap[t.classification] : undefined}
                upvotes={t.upvotes}
                status={t.status}
                createdAt={t.createdAt}
              />
            </Link>
          )
        })}
      </div>
    </div>
  )
}

function safeParse(s: string): unknown {
  try {
    return JSON.parse(s)
  } catch {
    return null
  }
}
