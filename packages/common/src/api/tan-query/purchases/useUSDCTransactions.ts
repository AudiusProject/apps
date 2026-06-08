import { useCallback, useRef } from 'react'

import {
  Id,
  GetUSDCTransactionsSortDirectionEnum,
  GetUSDCTransactionsSortMethodEnum,
  type GetUSDCTransactionsMethodEnum,
  type GetUSDCTransactionsTypeEnum,
  type TransactionDetails
} from '@audius/sdk'
import {
  InfiniteData,
  useInfiniteQuery,
  UseInfiniteQueryResult,
  useQueryClient
} from '@tanstack/react-query'

import { useQueryContext } from '~/api/tan-query/utils'
import { ID } from '~/models/Identifiers'
import { USDCTransactionDetails } from '~/models/USDCTransactions'

import { QUERY_KEYS } from '../queryKeys'
import { QueryKey, QueryOptions } from '../types'
import { useCurrentUserId } from '../users/account/useCurrentUserId'

const DEFAULT_PAGE_SIZE = 50

type UseUSDCTransactionsArgs = {
  pageSize?: number
  sortMethod?: GetUSDCTransactionsSortMethodEnum
  sortDirection?: GetUSDCTransactionsSortDirectionEnum
  type?: GetUSDCTransactionsTypeEnum[]
  method?: GetUSDCTransactionsMethodEnum
  /**
   * When true, refetch every loaded page periodically. Off by default —
   * baseline polling refetches every loaded page on each tick, which is
   * expensive and visually disruptive. Callers waiting on a specific
   * just-completed withdrawal should manage their own short-term polling
   * (see `useWithdrawalTransactionPoller` in WithdrawalsTab).
   */
  isPolling?: boolean
  /** Poll interval in ms when `isPolling` is true. */
  pollingInterval?: number
}

export const getUSDCTransactionsQueryKey = (
  currentUserId: ID | null | undefined,
  args: UseUSDCTransactionsArgs
) => {
  const {
    pageSize = DEFAULT_PAGE_SIZE,
    sortMethod = GetUSDCTransactionsSortMethodEnum.Date,
    sortDirection = GetUSDCTransactionsSortDirectionEnum.Desc,
    type,
    method
  } = args
  return [
    QUERY_KEYS.usdcTransactions,
    currentUserId,
    {
      sortMethod,
      sortDirection,
      type,
      method,
      pageSize
    }
  ] as unknown as QueryKey<InfiniteData<USDCTransactionDetails[]>>
}

/**
 * Parser to reformat transactions as they come back from the API.
 */
const parseTransaction = ({
  transaction
}: {
  transaction: TransactionDetails
}): USDCTransactionDetails => {
  const { change, balance, transactionType, method, ...rest } = transaction
  return {
    ...rest,
    transactionType: transactionType as any,
    method: method as any,
    change: change as any,
    balance: balance as any
  }
}

export const useUSDCTransactions = (
  {
    pageSize = DEFAULT_PAGE_SIZE,
    sortMethod = GetUSDCTransactionsSortMethodEnum.Date,
    sortDirection = GetUSDCTransactionsSortDirectionEnum.Desc,
    type,
    method,
    isPolling = false,
    pollingInterval = 5000
  }: UseUSDCTransactionsArgs = {},
  options?: QueryOptions
) => {
  const { audiusSdk } = useQueryContext()
  const { data: currentUserId } = useCurrentUserId()
  const queryClient = useQueryClient()
  const queryKey = getUSDCTransactionsQueryKey(currentUserId, {
    pageSize,
    sortMethod,
    sortDirection,
    type,
    method
  })

  const queryData = useInfiniteQuery({
    queryKey,
    initialPageParam: 0,
    getNextPageParam: (lastPage: USDCTransactionDetails[], allPages) => {
      if (lastPage.length < pageSize) return undefined
      return allPages.length * pageSize
    },
    queryFn: async ({ pageParam }) => {
      if (!currentUserId) return []
      const sdk = await audiusSdk()
      const { data = [] } = await sdk.users.getUSDCTransactions({
        id: Id.parse(currentUserId),
        limit: pageSize,
        offset: pageParam,
        sortMethod,
        sortDirection,
        type,
        method
      })
      return data.map((transaction) => parseTransaction({ transaction }))
    },
    select: (data) => data.pages.flat(),
    refetchInterval: isPolling ? pollingInterval : false,
    ...options,
    enabled: options?.enabled !== false && !!currentUserId
  })
  const reset = useCallback(() => {
    queryClient.resetQueries({
      queryKey
    })
  }, [queryClient, queryKey])

  // @ts-ignore
  queryData.reset = reset
  // Stable identity for loadNextPage so the consuming Table's `loadMoreRows`
  // doesn't change every render. We read the latest queryData from a ref
  // at call time instead of capturing it in the closure deps.
  const queryDataRef = useRef(queryData)
  queryDataRef.current = queryData
  const loadNextPageCallback = useCallback(() => {
    const q = queryDataRef.current
    if (q.isFetching || !q.hasNextPage) return undefined
    return q.fetchNextPage()
  }, [])
  // @ts-ignore
  queryData.loadNextPage = loadNextPageCallback
  return queryData as UseInfiniteQueryResult<USDCTransactionDetails[]> & {
    reset: typeof reset
    loadNextPage: typeof loadNextPageCallback
  }
}
