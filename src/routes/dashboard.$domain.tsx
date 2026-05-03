import { createFileRoute, Link, Outlet } from '@tanstack/react-router'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { LogOut } from 'lucide-react'

import { Btn, Chip, LogoMark, Tag } from '#/components/ui/brut'
import { ThemeToggle } from '#/components/theme-toggle'
import { authClient } from '#/lib/auth-client'
import { seoMeta } from '#/lib/seo'
import { workspaceStateQuery } from '#/lib/queries'

export const Route = createFileRoute('/dashboard/$domain')({
  component: DashboardLayout,
  // Loader fetches the workspace state during navigation so the
  // banner + claim child route hit a warm cache. Errors don't
  // block the layout — TurnstileSyncBanner just stays hidden if
  // workspace-state fails (its useQuery handles its own state).
  loader: ({ params, context }) =>
    context.queryClient
      .ensureQueryData(workspaceStateQuery(params.domain))
      .catch(() => null),
  head: ({ params }) => ({
    meta: seoMeta({
      path: `/dashboard/${params.domain}`,
      title: `${params.domain} · dashboard`,
      noindex: true,
    }),
  }),
})

function DashboardLayout() {
  const { domain } = Route.useParams() as { domain: string }
  return (
    <div className="fb-shell">
      <aside className="fb-shell-side">
        <div className="fb-shell-side-head">
          <LogoMark size={26} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              className="h-mono"
              style={{
                fontSize: 10,
                color: 'var(--fg-faint)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              workspace
            </div>
            <div
              style={{
                fontWeight: 600,
                fontSize: 14,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {domain}
            </div>
          </div>
        </div>

        <nav className="fb-shell-nav" aria-label="Dashboard sections">
          <SidebarLink to={`/dashboard/${domain}`}>Tickets</SidebarLink>
          <SidebarLink to={`/dashboard/${domain}/claim`}>Claim</SidebarLink>
          <SidebarLink to={`/dashboard/${domain}/integrations`}>
            Integrations
          </SidebarLink>
          <SidebarLink to={`/dashboard/${domain}/deliveries`}>
            Deliveries
          </SidebarLink>
          <SidebarLink to={`/dashboard/${domain}/team`}>Team</SidebarLink>
          <SidebarLink to={`/dashboard/${domain}/billing`}>Billing</SidebarLink>
          <SidebarLink to={`/dashboard/${domain}/settings`}>
            Settings
          </SidebarLink>
        </nav>

        <div className="fb-shell-side-foot">
          <Link
            to="/b/$domain"
            params={{ domain }}
            className="h-mono"
            style={{
              fontSize: 11,
              color: 'var(--fg-faint)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            view public board →
          </Link>
          <ThemeToggle />
          <SignOutButton />
        </div>
      </aside>

      <main className="fb-shell-main">
        <TurnstileSyncBanner domain={domain} />
        <Outlet />
      </main>
    </div>
  )
}

// Surfaces a "widget setup pending" banner when the workspace is
// claimed but the Cloudflare Turnstile hostname add hasn't
// succeeded yet. The customer can click "Retry now" to call
// /api/admin/turnstile-resync — useful when the inline call at
// claim time silently failed (e.g. operator's CF token had wrong
// scope, or a transient CF API error).
function TurnstileSyncBanner({ domain }: { domain: string }) {
  const [retryError, setRetryError] = useState<string | null>(null)
  // Reuses the layout loader's cache entry — same queryKey,
  // so the loader's prefetch warms this hook on first render.
  const state = useQuery({
    ...workspaceStateQuery(domain),
    refetchInterval: (q) =>
      q.state.data?.workspace.turnstile_synced_at ? false : 30_000,
  })

  const resync = useMutation({
    mutationFn: async () => {
      setRetryError(null)
      const res = await fetch(
        `/api/admin/turnstile-resync?domain=${encodeURIComponent(domain)}`,
        { method: 'POST', credentials: 'include' },
      )
      const body = (await res.json()) as
        | { ok: true; synced_at: number }
        | { ok: false; reason: string; details: unknown }
      if (!body.ok) throw new Error(body.reason)
      return body
    },
    onSuccess: () => state.refetch(),
    onError: (err) => setRetryError((err as Error).message),
  })

  const ws = state.data?.workspace
  if (!ws) return null
  if (ws.state !== 'claimed') return null
  if (ws.turnstile_synced_at) return null

  return (
    <div
      style={{
        margin: '12px 16px 0',
        padding: '14px 16px',
        border: '1.5px solid var(--accent)',
        background: 'var(--surface-alt)',
        fontSize: 14,
        lineHeight: 1.5,
      }}
      role="alert"
    >
      <div style={{ marginBottom: 10 }}>
        <strong>Widget setup pending.</strong>{' '}
        <span style={{ color: 'var(--fg-mute)' }}>
          Your domain is verified, but Cloudflare hasn't finished
          provisioning the bot for <code>{domain}</code>. This
          usually clears within a minute. If the retry below keeps
          failing, the underlying error is shown — that's a config
          issue on the FeedbackBot side, not yours.
        </span>
      </div>
      <Btn
        variant="primary"
        size="sm"
        onClick={() => resync.mutate()}
        disabled={resync.isPending}
      >
        {resync.isPending ? 'Retrying…' : 'Retry now'}
      </Btn>
      {retryError && (
        <div
          className="h-mono"
          style={{
            marginTop: 10,
            fontSize: 12,
            color: 'var(--danger)',
          }}
        >
          last error: {retryError}
        </div>
      )}
    </div>
  )
}

function SidebarLink({
  to,
  children,
}: {
  to: string
  children: React.ReactNode
}) {
  return (
    <Link
      to={to as never}
      activeOptions={{ exact: true }}
      className="hi-focus"
      style={{
        padding: '8px 10px',
        border: '1.5px solid transparent',
        fontSize: 14,
        fontWeight: 500,
      }}
      activeProps={{
        style: {
          padding: '8px 10px',
          border: '1.5px solid var(--border)',
          background: 'var(--accent)',
          color: 'var(--accent-ink)',
          fontSize: 14,
          fontWeight: 600,
        },
      }}
    >
      {children}
    </Link>
  )
}

// Sign-out lives in the sidebar footer next to the theme toggle.
// Hard-reload to / on success so the / loader re-runs against
// the cleared session cookies and routes the user accordingly.
function SignOutButton() {
  const [pending, setPending] = useState(false)
  return (
    <button
      type="button"
      disabled={pending}
      onClick={async () => {
        setPending(true)
        try {
          await authClient.signOut()
        } catch {
          // best-effort
        }
        window.location.href = '/'
      }}
      className="hi-focus"
      title="Sign out"
      style={{
        padding: 6,
        border: '1.5px solid var(--border)',
        background: 'transparent',
        color: 'var(--fg-mute)',
        cursor: pending ? 'wait' : 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
      }}
      aria-label="Sign out"
    >
      <LogOut size={14} strokeWidth={2} />
    </button>
  )
}

// Shared ticket card styling — used by index + (future) detail page.
export function AdminTicketRow({
  title,
  message,
  tagKind,
  upvotes,
  status,
  createdAt,
}: {
  title: string
  message: string
  tagKind?: 'bug' | 'feat' | 'query' | 'spam'
  upvotes: number
  status: string
  createdAt: number
}) {
  return (
    <div
      className="hi-card"
      style={{
        padding: 16,
        display: 'grid',
        gridTemplateColumns: '1fr auto',
        gap: 12,
      }}
    >
      <div>
        <div style={{ fontSize: 15, fontWeight: 600 }}>{title}</div>
        <div
          style={{
            fontSize: 13,
            color: 'var(--fg-mute)',
            marginTop: 4,
            lineHeight: 1.4,
          }}
        >
          {message.slice(0, 180)}
          {message.length > 180 ? '…' : ''}
        </div>
        <div
          style={{
            marginTop: 8,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flexWrap: 'wrap',
          }}
        >
          {tagKind && <Tag kind={tagKind} />}
          <Chip>{status}</Chip>
          <span
            className="h-mono"
            style={{ fontSize: 11, color: 'var(--fg-faint)' }}
          >
            {new Date(createdAt).toLocaleString()}
          </span>
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div className="h-display" style={{ fontSize: 24, lineHeight: 1 }}>
          {upvotes}
        </div>
        <div
          className="h-mono"
          style={{
            fontSize: 10,
            color: 'var(--fg-faint)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          upvotes
        </div>
      </div>
    </div>
  )
}
