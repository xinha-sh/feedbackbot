// Transactional mail via Resend. Verify the sending domain once at
// resend.com (Cloudflare DNS click-through handles the records),
// then every call site in the app uses this single helper. The only
// direct caller today is the Better Auth magic-link sender in
// src/lib/auth.ts; notifications routed to users in future features
// should land here too.

import { env } from '#/env'

const DEFAULT_FROM = 'FeedbackBot <noreply@usefeedbackbot.com>'

export type SendMail = {
  to: string
  subject: string
  text: string
  html?: string
}

export async function sendMail(msg: SendMail): Promise<void> {
  if (!env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY not configured; cannot send mail')
  }
  // `||` not `??` so an empty-string env var falls back to default
  // (see alchemy.run.ts comment for the GH-secret-empty-string trap).
  const from = env.RESEND_FROM || DEFAULT_FROM
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${env.RESEND_API_KEY}`,
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
    throw new Error(`resend ${res.status}: ${body || res.statusText}`)
  }
}
