import { createFileRoute, useSearch } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

import { Btn, LogoMark, Slab } from '#/components/ui/brut'
import { seoMeta } from '#/lib/seo'
import { PLAN_LABEL, type PlanId } from '#/lib/billing/plans'

const PLAN_INTENT_KEY = 'fb:intended_plan'

export const Route = createFileRoute('/login')({
  component: LoginPage,
  validateSearch: (raw: Record<string, unknown>) => ({
    plan: typeof raw.plan === 'string' ? (raw.plan as string) : undefined,
  }),
  head: () => ({
    meta: seoMeta({
      path: '/login',
      title: 'Sign in',
      noindex: true,
    }),
  }),
})

type Stage = 'idle' | 'sending' | 'sent' | 'error'

function LoginPage() {
  const search = useSearch({ from: '/login' })
  const planSlug = search.plan
  const planId: PlanId | null =
    planSlug === 'lite' ||
    planSlug === 'starter' ||
    planSlug === 'scale'
      ? planSlug
      : null
  const planLabel = planId ? PLAN_LABEL[planId] : null

  // Persist the intended plan so the billing page can auto-trigger
  // checkout after the user signs in and claims a workspace. Cleared
  // on successful checkout.
  useEffect(() => {
    if (typeof window === 'undefined' || !planId) return
    try {
      window.sessionStorage.setItem(PLAN_INTENT_KEY, planId)
    } catch {
      // SessionStorage denied (private mode, etc.) — best-effort only.
    }
  }, [planId])

  // If the visitor is already signed in, skip the form entirely:
  //   - has a claimed workspace → redirect to its billing page (which
  //     reads the sessionStorage intent and auto-fires checkout).
  //   - no claimed workspace yet → redirect to home so they can
  //     install the widget and claim one. The intent stays in
  //     sessionStorage for when they eventually land on billing.
  const [checkingSession, setCheckingSession] = useState(true)
  const [signedInNoWorkspace, setSignedInNoWorkspace] = useState(false)
  useEffect(() => {
    let cancelled = false
    type MeResponse = {
      signed_in: boolean
      workspaces: Array<{ id: string; domain: string; state: string; plan: string }>
    }
    fetch('/api/me/workspaces', { credentials: 'include' })
      .then((r) => (r.ok ? (r.json() as Promise<MeResponse>) : null))
      .then((data) => {
        if (cancelled) return
        if (!data?.signed_in) {
          setCheckingSession(false)
          return
        }
        const claimed = data.workspaces.find((w) => w.state === 'claimed')
        if (claimed) {
          window.location.replace(`/dashboard/${claimed.domain}/billing`)
          return
        }
        // Signed in but no claimed workspace — show an explicit
        // next-step panel instead of silently bouncing them home.
        setSignedInNoWorkspace(true)
        setCheckingSession(false)
      })
      .catch(() => {
        if (!cancelled) setCheckingSession(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Auth provider availability (e.g. preview deploys disable GitHub
  // because the OAuth callback URL is fixed at the prod apex).
  const [githubEnabled, setGithubEnabled] = useState(true)
  useEffect(() => {
    let cancelled = false
    type AuthState = {
      github_enabled?: boolean
      magic_link_enabled?: boolean
    }
    fetch('/api/auth-state')
      .then((r) => (r.ok ? (r.json() as Promise<AuthState>) : null))
      .then((data) => {
        if (cancelled) return
        if (data && data.github_enabled === false) setGithubEnabled(false)
      })
      .catch(() => {
        // best-effort; keep the button visible if the probe fails.
      })
    return () => {
      cancelled = true
    }
  }, [])

  const [email, setEmail] = useState('')
  const [stage, setStage] = useState<Stage>('idle')
  const [error, setError] = useState<string | null>(null)

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault()
    setStage('sending')
    setError(null)
    try {
      const res = await fetch('/api/auth/sign-in/magic-link', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email,
          callbackURL: '/',
        }),
      })
      if (!res.ok) {
        const t = await res.text().catch(() => '')
        throw new Error(t || `HTTP ${res.status}`)
      }
      setStage('sent')
    } catch (err) {
      setStage('error')
      setError((err as Error).message || 'Failed to send magic link')
    }
  }

  if (checkingSession) {
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
        Checking session…
      </div>
    )
  }

  if (signedInNoWorkspace) {
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
          <Slab num="02" right="next step">
            You're signed in.
          </Slab>
          {planLabel && (
            <div
              style={{
                padding: '10px 12px',
                marginTop: 8,
                marginBottom: 16,
                border: '1.5px solid var(--accent)',
                background: 'var(--surface-alt)',
                fontSize: 13,
                lineHeight: 1.5,
              }}
            >
              Your <strong>{planLabel}</strong> pick is saved. We'll
              auto-open checkout the moment you have a claimed workspace.
            </div>
          )}
          <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--fg-mute)' }}>
            FeedbackBot bills per workspace. To upgrade, you first need
            to install the widget on a site you control and claim the
            workspace (DNS TXT record or an email on the matching
            domain).
          </p>
          <ol
            style={{
              fontSize: 14,
              lineHeight: 1.7,
              color: 'var(--fg)',
              paddingLeft: 20,
              marginTop: 12,
            }}
          >
            <li>Copy the install snippet from the landing page.</li>
            <li>Drop it into your site's <code>&lt;head&gt;</code>.</li>
            <li>Open the widget once — that registers the workspace.</li>
            <li>Go to <code>/dashboard/&lt;your-domain&gt;/claim</code> and verify.</li>
          </ol>
          <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
            <Btn as="a" href="/#get-started" variant="primary">
              Install the widget
            </Btn>
            <Btn as="a" href="/" variant="ghost">
              Back to home
            </Btn>
          </div>
        </div>
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
      <div style={{ width: '100%', maxWidth: 440 }}>
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

        <Slab num="01" right="sign in">
          Welcome back
        </Slab>

        <p style={{ color: 'var(--fg-mute)', fontSize: 14, marginBottom: 24 }}>
          Sign in with a magic link or GitHub. No password.
        </p>

        {planLabel && (
          <div
            style={{
              padding: '10px 12px',
              marginBottom: 20,
              border: '1.5px solid var(--accent)',
              background: 'var(--surface-alt)',
              fontSize: 13,
              lineHeight: 1.5,
            }}
          >
            Heads up — you're signing in to upgrade to{' '}
            <strong>{planLabel}</strong>. After you sign in and claim a
            workspace, we'll take you straight to checkout.
          </div>
        )}

        {stage === 'sent' ? (
          <div
            className="hi-card"
            style={{
              padding: 20,
              borderColor: 'var(--accent)',
              background: 'var(--surface-alt)',
            }}
          >
            <strong style={{ fontSize: 15 }}>Check your inbox.</strong>
            <p
              style={{
                marginTop: 8,
                fontSize: 13,
                color: 'var(--fg-mute)',
                lineHeight: 1.5,
              }}
            >
              We sent a sign-in link to <code>{email}</code>. It's valid for
              5 minutes.
            </p>
            <div style={{ marginTop: 16 }}>
              <Btn
                variant="ghost"
                size="sm"
                onClick={() => setStage('idle')}
              >
                Use a different email
              </Btn>
            </div>
          </div>
        ) : (
          <>
            <form
              onSubmit={sendMagicLink}
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
                email
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
                disabled={stage === 'sending' || !email}
              >
                {stage === 'sending' ? 'Sending…' : 'Email me a magic link'}
              </Btn>
            </form>

            {githubEnabled && (
              <>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    margin: '20px 0',
                  }}
                >
                  <div
                    style={{
                      flex: 1,
                      height: 1.5,
                      background: 'var(--border)',
                    }}
                  />
                  <span
                    className="h-mono"
                    style={{
                      fontSize: 11,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: 'var(--fg-faint)',
                    }}
                  >
                    or
                  </span>
                  <div
                    style={{
                      flex: 1,
                      height: 1.5,
                      background: 'var(--border)',
                    }}
                  />
                </div>

                <Btn
                  as="a"
                  variant="default"
                  href="/api/auth/sign-in/social/github?callbackURL=/"
                >
                  Continue with GitHub
                </Btn>
              </>
            )}

            {error && (
              <div
                style={{
                  marginTop: 16,
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
          </>
        )}
      </div>
    </div>
  )
}
