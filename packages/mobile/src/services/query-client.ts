import { defaultRetryConfig, queryErrorHandler } from '@audius/common/api'
import { QueryCache, QueryClient } from '@tanstack/react-query'

import { env } from 'app/services/env'

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError(error, query) {
      queryErrorHandler(error, query)
    }
  }),
  defaultOptions: {
    queries: {
      retry: defaultRetryConfig,
      gcTime: 1000 * 60 * 5, // 5 minutes
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      refetchOnMount: true,
      throwOnError: env.ENVIRONMENT === 'development',
      experimental_prefetchInRender: true
    }
  }
})
