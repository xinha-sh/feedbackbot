import { createFileRoute, useSearch } from '@tanstack/react-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Check, Copy, Mail, RotateCw } from 'lucide-react'

import { Btn, Chip, LogoMark, Slab } from '#/components/ui/brut'
import { seoMeta } from '#/lib/seo'

export const Route = createFileRoute('/onboard/$workspaceId')({
  component: OnboardPage,
  validateSearch: (raw: Record<string, unknown>) => ({
    failed: typeof raw.failed === 'string' ? (raw.failed as string) : undefined,
  }),
  head: () => ({
    meta: seoMeta({
      path: '/onboard',
      title: 'Finish setup',
      noindex: true,
    }),
  }),
})

const PLACEHOLDER_DOMAIN_SUFFIX = '.feedbackbot.internal'

type MeResponse = {
  signed_in: boolean
  user: { id: string; email: string; is_anonymous: boolean } | null
  workspaces: Array<{
    id: string
    domain: string
    state: string
    plan: string
    subscription_id: string | null
    subscription_status: string | null
  }>
}

type RenameResponse = {
  workspace_id: string
  domain: string
  verification_token: string
  record_name: string
  record_value: string
}

type VerifyResponse = {
  verified: boolean
  checked_record: string
  found_values: Array<string>
}

type Stage =
  | 'loading'
  | 'not_found'
  | 'payment_failed'
  | 'enter_domain'
  | 'secure_account'
  | 'inbox_check'
  | 'verify_dns'
  | 'claimed'

function OnboardPage() {
  const { workspaceId } = Route.useParams() as { workspaceId: string }
  const search = useSearch({ from: '/onboard/$workspaceId' })
  const failedStatus = search.failed

  const me = useQuery({
    queryKey: ['me-workspaces'],
    queryFn: async (): Promise<MeResponse> => {
      const res = await fetch('/api/me/workspaces', {
        credentials: 'include',
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json()
    },
    refetchOnWindowFocus: false,
  })

  const workspace = me.data?.workspaces.find((w) => w.id === workspaceId)
  const isAnonymous = me.data?.user?.is_anonymous ?? false
  const isPlaceholder =
    workspace?.domain.endsWith(PLACEHOLDER_DOMAIN_SUFFIX) ?? false

  const stage: Stage = useMemo(() => {
    if (me.isLoading) return 'loading'
    if (failedStatus) return 'payment_failed'
    if (!workspace) return 'not_found'
    if (workspace.state === 'claimed') return 'claimed'
    if (isPlaceholder) return 'enter_domain'
    if (isAnonymous) return 'secure_account'
    return 'verify_dns'
  }, [me.isLoading, failedStatus, workspace, isPlaceholder, isAnonymous])

  // When the workspace hits `claimed`, jump into the dashboard.
  if (stage === 'claimed' && workspace) {
    window.location.replace(`/dashboard/${workspace.domain}`)
    return <Loading />
  }

  return (
    <div style={{ minHeight: '100vh', padding: '32px 24px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <Header />

        {stage === 'loading' && <Loading />}

        {stage === 'not_found' && <NotFound />}

        {stage === 'payment_failed' && (
          <PaymentFailed status={failedStatus ?? 'unknown'} />
        )}

        {stage === 'enter_domain' && workspace && (
          <EnterDomainStep
            workspaceId={workspaceId}
            onDone={() => me.refetch()}
          />
        )}

        {stage === 'secure_account' && workspace && (
          <SecureAccountStep workspaceId={workspaceId} />
        )}

        {stage === 'verify_dns' && workspace && (
          <VerifyDnsStep
            domain={workspace.domain}
            onClaimed={() => {
              window.location.href = `/dashboard/${workspace.domain}`
            }}
          />
        )}
      </div>
    </div>
  )
}

function Header() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        marginBottom: 32,
      }}
    >
      <LogoMark size={32} />
      <div style={{ fontWeight: 700, fontSize: 18 }}>FeedbackBot</div>
    </div>
  )
}

function Loading() {
  return (
    <div style={{ color: 'var(--fg-mute)', fontSize: 13 }}>Loading…</div>
  )
}

function NotFound() {
  return (
    <>
      <Slab num="!" right="nothing here">
        Workspace not found.
      </Slab>
      <p style={{ fontSize: 14, color: 'var(--fg-mute)', lineHeight: 1.6 }}>
        Either this link is stale or you're signed in on a different
        account than the one that made the purchase. Try signing in
        from the email we sent you, or start over.
      </p>
      <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
        <Btn as="a" href="/login" variant="primary">
          Sign in
        </Btn>
        <Btn as="a" href="/" variant="ghost">
          Back to home
        </Btn>
      </div>
    </>
  )
}

function PaymentFailed({ status }: { status: string }) {
  return (
    <>
      <Slab num="!" right="payment">
        Payment didn't go through.
      </Slab>
      <p style={{ fontSize: 14, color: 'var(--fg-mute)', lineHeight: 1.6 }}>
        Status from the payment provider:{' '}
        <code className="h-mono" style={{ fontSize: 12 }}>
          {status}
        </code>
        . Nothing was charged. You can try again or reach out if the card
        keeps getting rejected.
      </p>
      <div
        style={{ display: 'flex', gap: 10, marginTop: 20, flexWrap: 'wrap' }}
      >
        <Btn as="a" href="/#pricing" variant="primary">
          Try again
        </Btn>
        <Btn as="a" href="/" variant="ghost">
          Back to home
        </Btn>
        <Btn
          as="a"
          href="mailto:support@usefeedbackbot.com"
          variant="ghost"
        >
          Contact us
        </Btn>
      </div>
    </>
  )
}

function EnterDomainStep({
  workspaceId,
  onDone,
}: {
  workspaceId: string
  onDone: () => void
}) {
  const [domain, setDomain] = useState('')

  const rename = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/onboard/rename', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ workspace_id: workspaceId, domain }),
      })
      if (!res.ok) {
        const t = await res.text().catch(() => '')
        throw new Error(t || `HTTP ${res.status}`)
      }
      return (await res.json()) as RenameResponse
    },
    onSuccess: () => onDone(),
  })

  return (
    <>
      <Slab num="01" right="step 1 of 3">
        What's your domain?
      </Slab>
      <p style={{ fontSize: 14, color: 'var(--fg-mute)', marginBottom: 16 }}>
        Type the domain your feedback board is for. We'll link your
        subscription to it in the next step.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          rename.mutate()
        }}
        style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}
      >
        <input
          type="text"
          value={domain}
          onChange={(e) => setDomain(e.currentTarget.value)}
          placeholder="yourdomain.com"
          required
          className="hi-focus"
          style={{
            flex: 1,
            minWidth: 200,
            padding: '10px 12px',
            border: '1.5px solid var(--border)',
            background: 'var(--surface)',
            color: 'var(--fg)',
            fontSize: 15,
            fontFamily: 'inherit',
          }}
        />
        <Btn variant="primary" disabled={rename.isPending || !domain}>
          {rename.isPending ? 'Linking…' : 'Link domain'}
        </Btn>
      </form>
      {rename.error && <ErrBox msg={(rename.error as Error).message} />}
    </>
  )
}

function SecureAccountStep({ workspaceId }: { workspaceId: string }) {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)

  const send = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/auth/sign-in/magic-link', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email,
          callbackURL: `/onboard/${workspaceId}`,
        }),
      })
      if (!res.ok) {
        const t = await res.text().catch(() => '')
        throw new Error(t || `HTTP ${res.status}`)
      }
    },
    onSuccess: () => setSent(true),
  })

  if (sent) {
    return (
      <>
        <Slab num="02" right="step 2 of 3">
          Check your inbox.
        </Slab>
        <div
          className="hi-card"
          style={{
            padding: 20,
            marginTop: 8,
            background: 'var(--surface-alt)',
            borderColor: 'var(--accent)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 10,
            }}
          >
            <Mail size={16} strokeWidth={2} />
            <strong style={{ fontSize: 15 }}>
              Link sent to <code>{email}</code>
            </strong>
          </div>
          <p style={{ fontSize: 13, color: 'var(--fg-mute)', lineHeight: 1.5 }}>
            Click the link to secure this workspace to your account.
            It expires in 5 minutes. When you're back, we'll take you
            straight to DNS verification.
          </p>
          <div style={{ marginTop: 12 }}>
            <Btn
              size="sm"
              variant="ghost"
              onClick={() => {
                setSent(false)
              }}
            >
              <RotateCw size={12} strokeWidth={2} /> Use a different
              email
            </Btn>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Slab num="02" right="step 2 of 3">
        Secure your workspace.
      </Slab>
      <p style={{ fontSize: 14, color: 'var(--fg-mute)', marginBottom: 16 }}>
        Enter the email you'll use to sign in. We'll send you a
        one-click link and merge your current session into your real
        account. Receipts go here too.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          send.mutate()
        }}
        style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}
      >
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.currentTarget.value)}
          placeholder="you@yourdomain.com"
          required
          autoComplete="email"
          className="hi-focus"
          style={{
            flex: 1,
            minWidth: 200,
            padding: '10px 12px',
            border: '1.5px solid var(--border)',
            background: 'var(--surface)',
            color: 'var(--fg)',
            fontSize: 15,
            fontFamily: 'inherit',
          }}
        />
        <Btn variant="primary" disabled={send.isPending || !email}>
          {send.isPending ? 'Sending…' : 'Send link'}
        </Btn>
      </form>
      {send.error && <ErrBox msg={(send.error as Error).message} />}
    </>
  )
}

function VerifyDnsStep({
  domain,
  onClaimed,
}: {
  domain: string
  onClaimed: () => void
}) {
  const [copied, setCopied] = useState<'name' | 'value' | null>(null)

  // Poll the state endpoint so a TXT record published just seconds ago
  // is picked up without requiring the user to refresh.
  const record = useQuery({
    queryKey: ['workspace-claim', domain],
    queryFn: async () => {
      const res = await fetch(
        `/api/workspace-state?domain=${encodeURIComponent(domain)}`,
        { credentials: 'include' },
      )
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return (await res.json()) as {
        workspace: { state: string }
        claim_paths: {
          dns_txt: {
            record_name: string
            record_value: string
            verified: boolean
          }
        }
      }
    },
    refetchInterval: (q) =>
      q.state.data?.claim_paths.dns_txt.verified ? false : 5000,
  })

  const verify = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/verify-domain', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ domain }),
      })
      if (!res.ok) {
        const t = await res.text().catch(() => '')
        throw new Error(t || `HTTP ${res.status}`)
      }
      return (await res.json()) as VerifyResponse
    },
    onSuccess: (data) => {
      if (data.verified) onClaimed()
    },
  })

  // Auto-fire verify once the TXT record lookup reports a match. Many
  // DNS providers (Route 53, Cloudflare) propagate in under a minute
  // and we'd rather not make the user hunt for a button.
  const autoFiredRef = useRef(false)
  useEffect(() => {
    if (autoFiredRef.current) return
    if (record.data?.claim_paths.dns_txt.verified) {
      autoFiredRef.current = true
      verify.mutate()
    }
  }, [record.data, verify])

  async function onCopy(which: 'name' | 'value', text: string) {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      // clipboard denied — silent
    }
    setCopied(which)
    setTimeout(() => setCopied(null), 1200)
  }

  const recordName = record.data?.claim_paths.dns_txt.record_name
  const recordValue = record.data?.claim_paths.dns_txt.record_value

  return (
    <>
      <Slab num="03" right="step 3 of 3">
        Verify {domain}.
      </Slab>
      <p style={{ fontSize: 14, color: 'var(--fg-mute)', marginBottom: 16 }}>
        Add this TXT record to your DNS. Propagates usually within a
        minute — we check via Cloudflare's resolver.
      </p>

      {record.isLoading && <Loading />}

      {recordName && recordValue && (
        <div className="hi-card hi-card-raised" style={{ padding: 20 }}>
          <Row
            label="name"
            value={recordName}
            copied={copied === 'name'}
            onCopy={() => onCopy('name', recordName)}
          />
          <div style={{ height: 10 }} />
          <Row
            label="value"
            value={recordValue}
            copied={copied === 'value'}
            onCopy={() => onCopy('value', recordValue)}
          />
          <div
            style={{
              marginTop: 20,
              display: 'flex',
              gap: 12,
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            <Btn
              variant="primary"
              onClick={() => verify.mutate()}
              disabled={verify.isPending}
            >
              {verify.isPending ? 'Verifying…' : 'Verify now'}
            </Btn>
            {verify.data && !verify.data.verified && (
              <span
                className="h-mono"
                style={{ fontSize: 12, color: 'var(--fg-mute)' }}
              >
                not found · saw:{' '}
                {verify.data.found_values.join(', ') || '(none)'}
              </span>
            )}
            {verify.data?.verified && (
              <Chip>
                <Check size={11} /> verified
              </Chip>
            )}
          </div>
        </div>
      )}
      {verify.error && <ErrBox msg={(verify.error as Error).message} />}
    </>
  )
}

function Row({
  label,
  value,
  copied,
  onCopy,
}: {
  label: string
  value: string
  copied: boolean
  onCopy: () => void
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '80px 1fr auto',
        alignItems: 'center',
        gap: 10,
        border: '1.5px solid var(--border)',
        padding: '8px 10px',
        background: 'var(--surface)',
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
        {label}
      </span>
      <code
        className="h-mono"
        style={{
          fontSize: 13,
          color: 'var(--fg)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {value}
      </code>
      <Btn size="sm" variant="ghost" onClick={onCopy}>
        {copied ? (
          <>
            <Check size={12} /> copied
          </>
        ) : (
          <>
            <Copy size={12} /> copy
          </>
        )}
      </Btn>
    </div>
  )
}

function ErrBox({ msg }: { msg: string }) {
  return (
    <div
      style={{
        marginTop: 12,
        padding: 10,
        border: '1.5px solid var(--danger)',
        color: 'var(--danger)',
        fontFamily: 'var(--font-mono)',
        fontSize: 12,
      }}
    >
      {msg}
    </div>
  )
}
