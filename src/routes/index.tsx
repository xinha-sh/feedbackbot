import { createFileRoute } from '@tanstack/react-router'

import { Landing } from '#/components/landing'
import { canonicalLink, seoMeta } from '#/lib/seo'
import { loadLoginState } from '#/server/login-state'

export const Route = createFileRoute('/')({
  component: Landing,
  loader: async () => loadLoginState(),
  // Auth state can flip on every visit (sign-in lands here from
  // OAuth, sign-out hard-reloads here). Disable Router's loader
  // cache so the nav always reflects the current session.
  staleTime: 0,
  shouldReload: true,
  head: () => ({
    meta: seoMeta({ path: '/' }),
    links: [canonicalLink('/')],
  }),
})
