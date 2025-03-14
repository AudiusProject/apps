import { full, Id } from '@audius/sdk'
import {
  InfiniteData,
  UseInfiniteQueryResult,
  useInfiniteQuery
} from '@tanstack/react-query'

import { purchaseFromSDK } from '~/adapters/purchase'
import { useAudiusQueryContext } from '~/audius-query'
import { ID } from '~/models'
import {
  USDCContentPurchaseType,
  USDCPurchaseDetails
} from '~/models/USDCTransactions'

import { QUERY_KEYS } from './queryKeys'
import { QueryOptions } from './types'
import { useCollections } from './useCollections'
import { useTracks } from './useTracks'
import { useUsers } from './useUsers'

const PAGE_SIZE = 10

export type GetSalesListArgs = {
  userId: ID | null | undefined
  sortMethod?: full.GetPurchasesSortMethodEnum
  sortDirection?: full.GetPurchasesSortDirectionEnum
  pageSize?: number
}

export const getSalesQueryKey = ({
  userId,
  sortMethod,
  sortDirection,
  pageSize = PAGE_SIZE
}: GetSalesListArgs) => [
  QUERY_KEYS.sales,
  userId,
  { sortMethod, sortDirection, pageSize }
]

export const useSales = (args: GetSalesListArgs, options?: QueryOptions) => {
  const { userId, sortMethod, sortDirection, pageSize = PAGE_SIZE } = args
  const context = useAudiusQueryContext()
  const { audiusSdk } = context

  const queryResult = useInfiniteQuery({
    queryKey: getSalesQueryKey({ userId, sortMethod, sortDirection, pageSize }),
    initialPageParam: 0,
    getNextPageParam: (
      lastPage: USDCPurchaseDetails[],
      allPages: USDCPurchaseDetails[][]
    ) => {
      if (lastPage.length < pageSize) return undefined
      return allPages.length * pageSize
    },
    queryFn: async ({ pageParam }) => {
      const sdk = await audiusSdk()
      const { data = [] } = await sdk.full.users.getSales({
        id: Id.parse(userId!),
        userId: Id.parse(userId!),
        limit: pageSize,
        offset: pageParam,
        sortDirection,
        sortMethod
      })
      return data.map(purchaseFromSDK)
    },
    ...options,
    enabled: options?.enabled !== false && !!args.userId
  })

  const pages = queryResult.data?.pages
  const lastPage = pages?.[pages.length - 1]
  const userIdsToFetch = lastPage?.map(({ buyerUserId }) => buyerUserId)
  const trackIdsToFetch = lastPage
    ?.filter(({ contentType }) => contentType === USDCContentPurchaseType.TRACK)
    .map(({ contentId }) => contentId)
  const collectionIdsToFetch = lastPage
    ?.filter(({ contentType }) => contentType === USDCContentPurchaseType.ALBUM)
    .map(({ contentId }) => contentId)

  // Call the hooks dropping results to pre-fetch the data
  useUsers(userIdsToFetch)
  useTracks(trackIdsToFetch)
  useCollections(collectionIdsToFetch)

  const queryResultsWithSales = queryResult as UseInfiniteQueryResult<
    InfiniteData<USDCPurchaseDetails[], unknown>,
    Error
  > & { sales: USDCPurchaseDetails[] }
  queryResultsWithSales.sales = queryResult.data?.pages.flat() ?? []

  return queryResultsWithSales
}
