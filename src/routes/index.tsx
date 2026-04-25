import { createFileRoute } from '@tanstack/react-router'

import { Landing } from '#/components/landing'
import { canonicalLink, seoMeta } from '#/lib/seo'

export const Route = createFileRoute('/')({
  component: Landing,
  head: () => ({
    meta: seoMeta({ path: '/' }),
    links: [canonicalLink('/')],
  }),
})
