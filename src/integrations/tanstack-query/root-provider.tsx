import { QueryClient } from '@tanstack/react-query'

export function getContext() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // Treat data as fresh for 30s. Tab → tab navigation within
        // that window reads the warm cache instead of refetching.
        // Mutations explicitly invalidate when they need to.
        staleTime: 30_000,
        // Keep data in memory 5 min after the last subscriber
        // unmounts, so back/forward + sidebar bounces are instant.
        gcTime: 5 * 60_000,
        // Don't auto-refetch when the user tabs back. The 30s
        // stale window already covers stale-while-revalidate;
        // window-focus refetch on top of that is just noise.
        refetchOnWindowFocus: false,
        // 401/403 will not become 200 by retrying. Cap retries
        // at 1 so an unauth request doesn't quadruple the wait.
        retry: 1,
      },
    },
  })

  return {
    queryClient,
  }
}
