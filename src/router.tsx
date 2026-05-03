import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query'
import { getContext } from './integrations/tanstack-query/root-provider'

export function getRouter() {
  const context = getContext()

  const router = createTanStackRouter({
    routeTree,
    context,
    scrollRestoration: true,
    defaultPreload: 'intent',
    // Hover-prefetched data stays fresh for 30s. Without this,
    // every click would re-fetch the data the hover just loaded
    // (defaultPreloadStaleTime defaults to 0 = "always stale").
    // Match the QueryClient's queries.staleTime so router
    // preloads and useQuery stay in lockstep.
    defaultPreloadStaleTime: 30_000,
  })

  setupRouterSsrQueryIntegration({ router, queryClient: context.queryClient })

  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
