import { createFileRoute, Link } from '@tanstack/react-router'
import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'

import { Btn, Chip, Slab, Tag, type TagKind } from '#/components/ui/brut'
import type {
  ClassificationKind,
  TicketStatus,
} from '#/schema/ticket'
import { ClassificationKinds, TicketStatuses } from '#/schema/ticket'

type AdminTicket = {
  id: string
  workspaceId: string
  message: string
  pageUrl: string | null
  userAgent: string | null
  email: string | null
  status: TicketStatus
  classification: ClassificationKind | null
  classificationMeta: string | null
  upvotes: number
  createdAt: number
  updatedAt: number
}

type AdminComment = {
  id: string
  message: string
  authorName: string | null
  source: string
  createdAt: number
}

type DetailResponse = {
  ticket: AdminTicket
  comments: Array<AdminComment>
}

const kindMap: Partial<Record<ClassificationKind, TagKind>> = {
  bug: 'bug',
  feature: 'feat',
  query: 'query',
  spam: 'spam',
}

const ticketDetailQuery = (domain: string, id: string) =>
  queryOptions({
    queryKey: ['admin-ticket', domain, id],
    queryFn: async (): Promise<DetailResponse> => {
      const res = await fetch(
        `/api/admin/tickets/${encodeURIComponent(id)}?domain=${encodeURIComponent(domain)}`,
        { credentials: 'include' },
      )
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json()
    },
  })

export const Route = createFileRoute('/dashboard/$domain/tickets/$id')({
  component: TicketDetail,
  loader: ({ params, context }) =>
    context.queryClient
      .ensureQueryData(ticketDetailQuery(params.domain, params.id))
      .catch(() => null),
})

function TicketDetail() {
  const { domain, id } = Route.useParams() as { domain: string; id: string }
  const qc = useQueryClient()

  const { data, isLoading, error } = useQuery(ticketDetailQuery(domain, id))

  const patch = useMutation({
    mutationFn: async (body: Partial<{
      status: TicketStatus
      classification: ClassificationKind
    }>) => {
      const res = await fetch(
        `/api/admin/tickets/${encodeURIComponent(id)}?domain=${encodeURIComponent(domain)}`,
        {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body),
        },
      )
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-ticket', domain, id] }),
  })

  const close = useMutation({
    mutationFn: async () => {
      const res = await fetch(
        `/api/admin/tickets/${encodeURIComponent(id)}?domain=${encodeURIComponent(domain)}`,
        { method: 'DELETE', credentials: 'include' },
      )
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-ticket', domain, id] }),
  })

  return (
    <div style={{ maxWidth: 880 }}>
      <Link
        to="/dashboard/$domain"
        params={{ domain }}
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 12,
          color: 'var(--fg-mute)',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          marginBottom: 12,
        }}
      >
        <ArrowLeft size={12} /> back to tickets
      </Link>

      <Slab num="·" right={`id ${id}`}>
        Ticket detail
      </Slab>

      {isLoading && (
        <div className="h-mono" style={{ color: 'var(--fg-mute)' }}>
          Loading…
        </div>
      )}
      {error && (
        <div className="hi-card" style={{ padding: 20 }}>
          <strong>Couldn't load ticket</strong>
          <div style={{ marginTop: 6, fontSize: 13 }}>
            {(error as Error).message}
          </div>
        </div>
      )}

      {data && (
        <>
          <div className="hi-card hi-card-raised" style={{ padding: 24, marginBottom: 20 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 14,
                flexWrap: 'wrap',
              }}
            >
              {data.ticket.classification && kindMap[data.ticket.classification] && (
                <Tag kind={kindMap[data.ticket.classification]!} />
              )}
              <Chip>{data.ticket.status}</Chip>
              <span
                className="h-mono"
                style={{ fontSize: 11, color: 'var(--fg-faint)' }}
              >
                {new Date(data.ticket.createdAt).toLocaleString()}
              </span>
              <div style={{ flex: 1 }} />
              <span className="h-mono" style={{ fontSize: 11, color: 'var(--fg-faint)' }}>
                {data.ticket.upvotes} upvotes
              </span>
            </div>

            <p
              style={{
                fontSize: 16,
                lineHeight: 1.55,
                whiteSpace: 'pre-wrap',
              }}
            >
              {data.ticket.message}
            </p>

            <div
              className="hi-rule-soft"
              style={{ marginTop: 20, marginBottom: 16 }}
            />

            <dl
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(80px, max-content) 1fr',
                gap: '6px 16px',
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
              }}
            >
              <dt style={{ color: 'var(--fg-faint)' }}>from</dt>
              <dd style={{ margin: 0 }}>
                {data.ticket.email ?? <em>(anonymous)</em>}
              </dd>
              <dt style={{ color: 'var(--fg-faint)' }}>page</dt>
              <dd style={{ margin: 0, overflowWrap: 'anywhere' }}>
                {data.ticket.pageUrl ?? '—'}
              </dd>
              <dt style={{ color: 'var(--fg-faint)' }}>user-agent</dt>
              <dd style={{ margin: 0, overflowWrap: 'anywhere' }}>
                {data.ticket.userAgent ?? '—'}
              </dd>
            </dl>
          </div>

          <div
            className="hi-card"
            style={{
              padding: 16,
              marginBottom: 16,
              display: 'flex',
              flexWrap: 'wrap',
              gap: 10,
              alignItems: 'center',
            }}
          >
            <span
              className="h-mono"
              style={{
                fontSize: 11,
                color: 'var(--fg-faint)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              status
            </span>
            {TicketStatuses.map((s) => (
              <Btn
                key={s}
                size="sm"
                variant={data.ticket.status === s ? 'primary' : 'default'}
                onClick={() => patch.mutate({ status: s })}
                disabled={patch.isPending}
              >
                {s}
              </Btn>
            ))}
            <div style={{ flex: 1 }} />
            <Btn
              size="sm"
              variant="ghost"
              onClick={() => close.mutate()}
              disabled={close.isPending}
            >
              close
            </Btn>
          </div>

          <ClassificationControls
            ticketId={id}
            domain={domain}
            current={data.ticket.classification}
            patching={patch.isPending}
            onPatch={(c) => patch.mutate({ classification: c })}
          />

          <Slab num="·" right={`${data.comments.length} thread`}>
            Comments
          </Slab>
          {data.comments.length === 0 ? (
            <div
              style={{
                padding: 16,
                border: '1.5px dashed var(--border-soft)',
                color: 'var(--fg-faint)',
                fontSize: 13,
              }}
            >
              No comments yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {data.comments.map((c) => (
                <div key={c.id} className="hi-card" style={{ padding: 14 }}>
                  <div
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 11,
                      color: 'var(--fg-faint)',
                      marginBottom: 6,
                    }}
                  >
                    {c.authorName ?? 'anonymous'} ·{' '}
                    {new Date(c.createdAt).toLocaleString()}
                  </div>
                  <div style={{ fontSize: 14, whiteSpace: 'pre-wrap' }}>
                    {c.message}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}


// Classification controls live below the status row on the
// detail page. Three states the operator might be in:
//
// 1. Classification present + AI-confident → just show the tag
//    + a manual override dropdown for corrections (mis-classified
//    bugs as features, etc.).
// 2. Classification null (worker failed after queue retries) →
//    show a "Retry classification" button that re-enqueues, plus
//    the manual override dropdown for when the model keeps
//    failing on a quirky ticket.
// 3. Operator wants to manually classify regardless of AI →
//    same dropdown lets them override anytime.
function ClassificationControls({
  ticketId,
  domain,
  current,
  patching,
  onPatch,
}: {
  ticketId: string
  domain: string
  current: ClassificationKind | null
  patching: boolean
  onPatch: (c: ClassificationKind) => void
}) {
  const qc = useQueryClient()
  const retry = useMutation({
    mutationFn: async () => {
      const res = await fetch(
        `/api/admin/tickets/${encodeURIComponent(ticketId)}/classify?domain=${encodeURIComponent(domain)}`,
        { method: 'POST', credentials: 'include' },
      )
      if (!res.ok) {
        const t = await res.text().catch(() => '')
        throw new Error(t || `HTTP ${res.status}`)
      }
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-ticket', domain, ticketId] })
    },
  })

  return (
    <div
      className="hi-card"
      style={{
        padding: 16,
        marginBottom: 24,
        display: 'flex',
        flexWrap: 'wrap',
        gap: 10,
        alignItems: 'center',
      }}
    >
      <span
        className="h-mono"
        style={{
          fontSize: 11,
          color: 'var(--fg-faint)',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}
      >
        kind
      </span>
      {current === null ? (
        <span
          className="h-mono"
          style={{
            fontSize: 11,
            color: 'var(--fg-mute)',
            padding: '2px 8px',
            border: '1.5px dashed var(--border-soft)',
          }}
        >
          awaiting classification
        </span>
      ) : null}
      {ClassificationKinds.map((k) => (
        <Btn
          key={k}
          size="sm"
          variant={current === k ? 'primary' : 'default'}
          onClick={() => onPatch(k)}
          disabled={patching}
        >
          {k}
        </Btn>
      ))}
      <div style={{ flex: 1 }} />
      <Btn
        size="sm"
        variant="ghost"
        onClick={() => retry.mutate()}
        disabled={retry.isPending}
        title="Re-run AI classifier on this ticket"
      >
        {retry.isPending ? 'Retrying…' : 'Retry classifier'}
      </Btn>
      {retry.error && (
        <span style={{ fontSize: 12, color: 'var(--danger)' }}>
          {(retry.error as Error).message}
        </span>
      )}
    </div>
  )
}
