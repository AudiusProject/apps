import { useCallback, useMemo } from 'react'

import { full, Id } from '@audius/sdk'
import { InfiniteData, useInfiniteQuery } from '@tanstack/react-query'

import { purchaseFromSDK } from '~/adapters/purchase'
import { useQueryContext, makeLoadNextPage } from '~/api/tan-query/utils'
import { ID } from '~/models'
import {
  USDCContentPurchaseType,
  USDCPurchaseDetails
} from '~/models/USDCTransactions'

import { useCollections } from '../collection/useCollections'
import { QUERY_KEYS } from '../queryKeys'
import { useTracks } from '../tracks/useTracks'
import { QueryKey, QueryOptions } from '../types'
import { useUsers } from '../users/useUsers'
import { combineQueryStatuses } from '../utils/combineQueryResults'

const PAGE_SIZE = 10

export type GetPurchaseListArgs = {
  userId: ID | null | undefined
  sortMethod?: full.GetPurchasesSortMethodEnum
  sortDirection?: full.GetPurchasesSortDirectionEnum
  pageSize?: number
}

export const getPurchasesQueryKey = ({
  userId,
  sortMethod,
  sortDirection,
  pageSize
}: GetPurchaseListArgs) =>
  [
    QUERY_KEYS.purchases,
    userId,
    {
      sortMethod,
      sortDirection,
      pageSize
    }
  ] as unknown as QueryKey<InfiniteData<USDCPurchaseDetails[]>>

export const usePurchases = (
  args: GetPurchaseListArgs,
  options?: QueryOptions
) => {
  const { userId, sortMethod, sortDirection, pageSize = PAGE_SIZE } = args
  const { audiusSdk } = useQueryContext()
  const queryResult = useInfiniteQuery({
    queryKey: getPurchasesQueryKey(args),
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
      const { data = [] } = await sdk.full.users.getPurchases({
        id: Id.parse(userId),
        userId: Id.parse(userId),
        limit: pageSize,
        offset: pageParam,
        sortDirection,
        sortMethod
      })
      return data.map(purchaseFromSDK)
    },
    select: (data) => data.pages.flat(),
    ...options,
    enabled: options?.enabled !== false && !!userId
  })

  const { userIdsToFetch, trackIdsToFetch, collectionIdsToFetch } = useMemo(
    () => ({
      userIdsToFetch: queryResult.data?.map(({ buyerUserId }) => buyerUserId),
      trackIdsToFetch: queryResult.data
        ?.filter(
          ({ contentType }) => contentType === USDCContentPurchaseType.TRACK
        )
        .map(({ contentId }) => contentId),
      collectionIdsToFetch: queryResult.data
        ?.filter(
          ({ contentType }) => contentType === USDCContentPurchaseType.ALBUM
        )
        .map(({ contentId }) => contentId)
    }),
    [queryResult.data]
  )

  // Call the hooks dropping results to pre-fetch the data
  const usersQueryResult = useUsers(userIdsToFetch)
  const tracksQueryResult = useTracks(trackIdsToFetch)
  const collectionsQueryResult = useCollections(collectionIdsToFetch)

  const loadNextPageCallback = useCallback(() => {
    makeLoadNextPage(queryResult)
  }, [queryResult])

  return {
    ...combineQueryStatuses([
      queryResult,
      usersQueryResult,
      tracksQueryResult,
      collectionsQueryResult
    ]),
    data: queryResult.data,
    loadNextPage: loadNextPageCallback
  }
}
