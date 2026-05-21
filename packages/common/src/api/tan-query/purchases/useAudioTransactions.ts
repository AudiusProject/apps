import { useCallback, useRef } from 'react'

import {
  GetAudioTransactionsSortMethodEnum,
  GetAudioTransactionsSortDirectionEnum,
  Id
} from '@audius/sdk'
import { InfiniteData, useInfiniteQuery } from '@tanstack/react-query'

import { audioTransactionFromSdk } from '~/adapters/audioTransactions'
import { useQueryContext } from '~/api/tan-query/utils'
import { TransactionDetails } from '~/store/ui/transaction-details/types'
import { Nullable } from '~/utils/typeUtils'

import { QUERY_KEYS } from '../queryKeys'
import { QueryKey, QueryOptions } from '../types'
import { useCurrentUserId } from '../users/account/useCurrentUserId'

type GetAudioTransactionsArgs = {
  pageSize?: number
  sortMethod?: GetAudioTransactionsSortMethodEnum
  sortDirection?: GetAudioTransactionsSortDirectionEnum
}

// /v1/users/{id}/transactions/audio caps `limit` at 100 server-side. Keep the
// page size at or below that.
export const DEFAULT_AUDIO_TRANSACTIONS_BATCH_SIZE = 50

export const getAudioTransactionsQueryKey = ({
  userId,
  sortMethod,
  sortDirection,
  pageSize
}: GetAudioTransactionsArgs & { userId: Nullable<number> | undefined }) =>
  [
    QUERY_KEYS.audioTransactions,
    userId,
    {
      sortMethod,
      sortDirection,
      pageSize
    }
  ] as unknown as QueryKey<InfiniteData<TransactionDetails[]>>

export const useAudioTransactions = (
  args: GetAudioTransactionsArgs = {},
  options?: QueryOptions
) => {
  const { audiusSdk } = useQueryContext()
  const { data: userId } = useCurrentUserId()
  const {
    pageSize = DEFAULT_AUDIO_TRANSACTIONS_BATCH_SIZE,
    sortMethod,
    sortDirection
  } = args

  const queryResult = useInfiniteQuery({
    queryKey: getAudioTransactionsQueryKey({
      userId,
      sortMethod,
      sortDirection,
      pageSize
    }),
    initialPageParam: 0,
    getNextPageParam: (
      lastPage: TransactionDetails[],
      allPages: TransactionDetails[][]
    ) => {
      if (lastPage.length < pageSize) return undefined
      return allPages.length * pageSize
    },
    queryFn: async ({ pageParam }) => {
      if (!userId) return []

      const sdk = await audiusSdk()
      const response = await sdk.users.getAudioTransactions({
        id: Id.parse(userId),
        offset: pageParam,
        limit: pageSize,
        sortMethod,
        sortDirection
      })

      if (!response?.data) return []

      return response.data.map(audioTransactionFromSdk)
    },
    select: (data) => data.pages.flat(),
    ...options,
    enabled: options?.enabled !== false && !!userId
  })

  // Stable identity for loadNextPage so the consuming Table's `loadMoreRows`
  // doesn't change every render. Mirrors the pattern in usePurchases.
  const queryResultRef = useRef(queryResult)
  queryResultRef.current = queryResult
  const loadNextPage = useCallback(() => {
    const q = queryResultRef.current
    if (q.isFetching || !q.hasNextPage) return undefined
    return q.fetchNextPage()
  }, [])

  return {
    ...queryResult,
    data: queryResult.data,
    loadNextPage
  }
}
