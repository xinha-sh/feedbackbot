// Transactional mail via Unosend. Sign up at unosend.co, verify the
// sending domain once, then every call site in the app uses this
// single helper. The only direct caller today is the Better Auth
// magic-link sender in src/lib/auth.ts; notifications routed to
// users in future features should land here too.

import { env } from '#/env'

const DEFAULT_FROM = 'FeedbackBot <noreply@usefeedbackbot.com>'

export type SendMail = {
  to: string
  subject: string
  text: string
  html?: string
}

export async function sendMail(msg: SendMail): Promise<void> {
  if (!env.UNOSEND_API_KEY) {
    throw new Error('UNOSEND_API_KEY not configured; cannot send mail')
  }
  const from = env.UNOSEND_FROM ?? DEFAULT_FROM
  const res = await fetch('https://api.unosend.co/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${env.UNOSEND_API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [msg.to],
      subject: msg.subject,
      text: msg.text,
      html: msg.html ?? msg.text,
    }),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`unosend ${res.status}: ${body || res.statusText}`)
  }
}
