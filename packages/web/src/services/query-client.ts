import { defaultRetryConfig, queryErrorHandler } from '@audius/common/api'
import { QueryCache, QueryClient } from '@tanstack/react-query'

import { env } from './env'
export const queryClient = new QueryClient({
  // In order to have a default error catcher, we need to use a custom query cache
  // ref: https://tkdodo.eu/blog/react-query-error-handling
  queryCache: new QueryCache({
    onError(error, query) {
      queryErrorHandler(error, query)
    }
  }),
  defaultOptions: {
    queries: {
      // By default, tan-query will retry on 404s. We intentionally disable retrying on 400 type errors.
      retry: defaultRetryConfig,
      gcTime: 1000 * 60 * 5, // 5 minutes
      staleTime: 1000 * 60 * 5, // 5 minutes
      // All the refetches are enabled by default - they should only run every 5 minutes with our intended stale time
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      refetchOnMount: true,
      throwOnError: env.ENVIRONMENT === 'development',
      experimental_prefetchInRender: true
    }
  }
})
