import { createFileRoute } from '@tanstack/react-router'

import { Landing } from '#/components/landing'
import { canonicalLink, seoMeta } from '#/lib/seo'
import { loadLoginState } from '#/server/login-state'

export const Route = createFileRoute('/')({
  component: Landing,
  loader: async () => loadLoginState(),
  head: () => ({
    meta: seoMeta({ path: '/' }),
    links: [canonicalLink('/')],
  }),
})
