// Shared SEO helpers. TanStack Start's head() returns meta[] + links[]
// arrays (see https://tanstack.com/start/v0/docs/framework/react/guide/seo).
// No built-in title template — we do it manually.

// SITE_URL is consumed by the sitemap route too — the others stay
// internal to this module's `seoMeta`/`canonicalLink` helpers.
const SITE_NAME = 'FeedbackBot'
export const SITE_URL = 'https://usefeedbackbot.com'
const SITE_DESCRIPTION =
  'Zero-signup feedback for any website. Drop one <script> tag — feedback flows in, AI-classified into bugs, features, queries, and spam, then fanned out to Slack, webhooks, and more. Claim the workspace later via DNS or email.'
const OG_IMAGE = `${SITE_URL}/og-image.svg`

function titleFor(page?: string): string {
  return page ? `${page} · ${SITE_NAME}` : `${SITE_NAME} — zero-signup feedback`
}

type SeoMeta = Array<
  | { title: string }
  | { name: string; content: string }
  | { property: string; content: string }
  | { charSet: string }
  | { httpEquiv: string; content: string }
>

export function seoMeta(input: {
  title?: string
  description?: string
  path?: string
  image?: string
  noindex?: boolean
  type?: 'website' | 'article'
}): SeoMeta {
  const title = titleFor(input.title)
  const description = input.description ?? SITE_DESCRIPTION
  const url = input.path ? `${SITE_URL}${input.path}` : SITE_URL
  const image = input.image ?? OG_IMAGE
  const meta: SeoMeta = [
    { title },
    { name: 'description', content: description },
    { property: 'og:title', content: title },
    { property: 'og:description', content: description },
    { property: 'og:url', content: url },
    { property: 'og:type', content: input.type ?? 'website' },
    { property: 'og:site_name', content: SITE_NAME },
    { property: 'og:image', content: image },
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: title },
    { name: 'twitter:description', content: description },
    { name: 'twitter:image', content: image },
  ]
  if (input.noindex) {
    meta.push({ name: 'robots', content: 'noindex,nofollow' })
  }
  return meta
}

export function canonicalLink(path: string) {
  return { rel: 'canonical', href: `${SITE_URL}${path}` }
}
