import { useCallback } from 'react'

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

import { useQueryContext, makeLoadNextPage } from '~/api/tan-query/utils'
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
    method
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
    refetchInterval: 5000, // Poll every 5 seconds
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
  const loadNextPageCallback = useCallback(
    () => makeLoadNextPage(queryData),
    [queryData]
  )
  // @ts-ignore
  queryData.loadNextPage = loadNextPageCallback
  return queryData as UseInfiniteQueryResult<USDCTransactionDetails[]> & {
    reset: typeof reset
    loadNextPage: typeof loadNextPageCallback
  }
}
