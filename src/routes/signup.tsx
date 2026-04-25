import { createFileRoute, useSearch } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

import { Btn, LogoMark, Slab } from '#/components/ui/brut'
import { seoMeta } from '#/lib/seo'
import { PLAN_LABEL, type PlanId } from '#/lib/billing/plans'

const PLACEHOLDER_DOMAIN_SUFFIX = '.feedbackbot.internal'

export const Route = createFileRoute('/signup')({
  component: SignupPage,
  validateSearch: (raw: Record<string, unknown>) => ({
    plan: typeof raw.plan === 'string' ? (raw.plan as string) : undefined,
  }),
  head: () => ({
    meta: seoMeta({
      path: '/signup',
      title: 'Sign up',
      noindex: true,
    }),
  }),
})

type Stage = 'idle' | 'submitting' | 'error'

function SignupPage() {
  const search = useSearch({ from: '/signup' })
  const rawPlan = search.plan
  const planId: PlanId | null =
    rawPlan === 'lite' || rawPlan === 'starter' || rawPlan === 'scale'
      ? rawPlan
      : null
  const planLabel = planId ? PLAN_LABEL[planId] : null

  const [email, setEmail] = useState('')
  const [stage, setStage] = useState<Stage>('idle')
  const [error, setError] = useState<string | null>(null)

  // Resume logic: if the user already has a workspace associated with
  // their session, decide what to do.
  //   • Paid / renamed / claim-in-progress → redirect to /onboard/<wsId>.
  //   • Free + placeholder + unpaid → leave the form visible; the
  //     abandon endpoint will clean it up when they submit.
  const [resumeChecked, setResumeChecked] = useState(false)
  useEffect(() => {
    let cancelled = false
    async function check() {
      try {
        const res = await fetch('/api/me/workspaces', {
          credentials: 'include',
        })
        if (!res.ok) return
        const data = (await res.json()) as {
          signed_in: boolean
          workspaces: Array<{
            id: string
            domain: string
            state: string
            plan: string
            subscription_id: string | null
          }>
        }
        if (cancelled || !data.signed_in) return
        const resumable = data.workspaces.find((w) => {
          if (w.state === 'claimed') return false
          const isPlaceholder = w.domain.endsWith(
            PLACEHOLDER_DOMAIN_SUFFIX,
          )
          const paid = w.plan !== 'free' || !!w.subscription_id
          // Paid workspaces always resume. Unpaid + already-named
          // workspaces resume too (they made partial progress).
          // Unpaid + placeholder = abandoned; let the form re-start.
          return paid || !isPlaceholder
        })
        if (resumable) {
          window.location.replace(`/onboard/${resumable.id}`)
          return
        }
        const alreadyClaimed = data.workspaces.find(
          (w) => w.state === 'claimed',
        )
        if (alreadyClaimed) {
          window.location.replace(`/dashboard/${alreadyClaimed.domain}`)
          return
        }
      } finally {
        if (!cancelled) setResumeChecked(true)
      }
    }
    void check()
    return () => {
      cancelled = true
    }
  }, [])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!planId) {
      setError('No plan selected. Go back to the pricing page.')
      setStage('error')
      return
    }
    setStage('submitting')
    setError(null)
    try {
      // 1. Establish a session (anonymous is fine). Skip if already
      //    signed in.
      const sessionRes = await fetch('/api/auth/get-session', {
        credentials: 'include',
      })
      const currentSession = sessionRes.ok
        ? ((await sessionRes.json()) as { user?: { id?: string } } | null)
        : null
      if (!currentSession?.user?.id) {
        const anonRes = await fetch('/api/auth/sign-in/anonymous', {
          method: 'POST',
          credentials: 'include',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({}),
        })
        if (!anonRes.ok) {
          const t = await anonRes.text().catch(() => '')
          throw new Error(
            `anonymous sign-in failed (${anonRes.status}): ${t || 'no body'}`.slice(0, 400),
          )
        }
      } else {
        // We already have a session; clean up any stale abandoned
        // placeholder workspaces so we start with a fresh slate.
        await fetch('/api/signup/abandon', {
          method: 'POST',
          credentials: 'include',
        }).catch(() => {
          // abandon failures are non-fatal; the server's rename step
          // will surface any real conflict.
        })
      }

      // 2. Start checkout.
      const res = await fetch('/api/signup/start-checkout', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, plan: planId }),
      })
      if (!res.ok) {
        const t = await res.text().catch(() => '')
        throw new Error(t || `HTTP ${res.status}`)
      }
      const { url } = (await res.json()) as { url: string }
      window.location.href = url
    } catch (err) {
      setStage('error')
      setError((err as Error).message || 'Signup failed')
    }
  }

  if (!resumeChecked) {
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
        Checking your account…
      </div>
    )
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: 24,
      }}
    >
      <div style={{ width: '100%', maxWidth: 460 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginBottom: 24,
          }}
        >
          <LogoMark size={36} />
          <div style={{ fontWeight: 700, fontSize: 18 }}>FeedbackBot</div>
        </div>

        <Slab num="01" right={planLabel ? `plan · ${planLabel}` : 'sign up'}>
          {planLabel ? `Start with ${planLabel}` : 'Start free'}
        </Slab>

        {planLabel ? (
          <p style={{ color: 'var(--fg-mute)', fontSize: 14, marginBottom: 20 }}>
            Enter your email. We'll open a secure checkout, and you'll link
            your domain right after payment.
          </p>
        ) : (
          <div
            className="hi-card"
            style={{
              padding: 16,
              marginBottom: 20,
              borderColor: 'var(--danger)',
              background: 'color-mix(in oklch, var(--danger) 6%, transparent)',
            }}
          >
            No plan selected.{' '}
            <a href="/#pricing" style={{ textDecoration: 'underline' }}>
              Pick a plan
            </a>{' '}
            first.
          </div>
        )}

        {planId && (
          <form
            onSubmit={onSubmit}
            style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
          >
            <label
              className="h-mono"
              style={{
                fontSize: 11,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'var(--fg-faint)',
              }}
            >
              email for receipts + sign-in
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.currentTarget.value)}
              placeholder="you@yourdomain.com"
              required
              autoComplete="email"
              className="hi-focus"
              style={{
                padding: '10px 12px',
                border: '1.5px solid var(--border)',
                background: 'var(--surface)',
                color: 'var(--fg)',
                fontSize: 15,
                fontFamily: 'inherit',
              }}
            />
            <Btn
              variant="primary"
              disabled={stage === 'submitting' || !email}
            >
              {stage === 'submitting'
                ? 'Opening checkout…'
                : `Continue to checkout`}
            </Btn>

            <div
              className="h-mono"
              style={{
                fontSize: 11,
                color: 'var(--fg-faint)',
                lineHeight: 1.5,
                marginTop: 4,
              }}
            >
              You'll pay first, then paste a DNS TXT record (or sign in with
              an email on your domain) to claim the workspace. Tickets before
              claim are held up to 100.
            </div>

            {error && (
              <div
                style={{
                  marginTop: 8,
                  padding: 10,
                  border: '1.5px solid var(--danger)',
                  color: 'var(--danger)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                }}
              >
                {error}
              </div>
            )}
          </form>
        )}

        <div
          style={{
            marginTop: 20,
            fontSize: 12,
            color: 'var(--fg-faint)',
            textAlign: 'center',
          }}
        >
          Already have an account?{' '}
          <a href="/login" style={{ textDecoration: 'underline' }}>
            Sign in
          </a>
        </div>
      </div>
    </div>
  )
}
