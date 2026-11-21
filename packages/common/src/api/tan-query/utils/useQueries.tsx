import { useQueries as useTanQueries } from '@tanstack/react-query'
import type {
  QueriesOptions,
  QueryClient,
  UseQueryResult
} from '@tanstack/react-query'

import { combineQueryResults } from './combineQueryResults'

type UseQueriesConfig<
  T extends Array<any>,
  TCombinedResult = UseQueryResult<T, Error>
> = {
  queries?: readonly [...QueriesOptions<T>]
  combine?: (result: TCombinedResult[]) => TCombinedResult
}

export function useQueries<T extends Array<any>>(
  { queries, ...options }: UseQueriesConfig<T>,
  queryClient?: QueryClient
) {
  return useTanQueries(
    {
      queries: (queries ?? [
        {
          queryKey: ['never-resolves'],
          queryFn: () => new Promise(() => {})
        }
      ]) as readonly [...QueriesOptions<T>],
      // @ts-expect-error
      combine: combineQueryResults<T>,
      ...options
    },
    queryClient
  )
}
