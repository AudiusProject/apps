import { GetAlbumsByUserSortMethodEnum, Id, OptionalId } from '@audius/sdk'
import {
  InfiniteData,
  useInfiniteQuery,
  useQueryClient
} from '@tanstack/react-query'

import { userCollectionMetadataFromSDK } from '~/adapters/collection'
import { transformAndCleanList } from '~/adapters/utils'
import { useQueryContext } from '~/api/tan-query/utils'
import { ID } from '~/models'

import { useCollections } from '../collection/useCollections'
import { QUERY_KEYS } from '../queryKeys'
import { QueryKey, QueryOptions } from '../types'
import { entityCacheOptions } from '../utils/entityCacheOptions'
import { primeCollectionData } from '../utils/primeCollectionData'

import { useCurrentUserId } from './account/useCurrentUserId'

type GetAlbumsOptions = {
  userId: number | null | undefined
  pageSize?: number
  sortMethod?: GetAlbumsByUserSortMethodEnum
  query?: string
}

export const getUserAlbumsQueryKey = (params: GetAlbumsOptions) => {
  const { userId, pageSize, sortMethod } = params
  return [
    QUERY_KEYS.userAlbums,
    userId,
    {
      pageSize,
      sortMethod
    }
  ] as unknown as QueryKey<InfiniteData<ID[]>>
}

export const useUserAlbums = (
  params: GetAlbumsOptions,
  options?: QueryOptions
) => {
  const { audiusSdk } = useQueryContext()
  const { data: currentUserId } = useCurrentUserId()
  const { userId, pageSize = 5, sortMethod = 'recent', query } = params
  const queryClient = useQueryClient()

  const queryRes = useInfiniteQuery({
    queryKey: getUserAlbumsQueryKey(params),
    initialPageParam: 0,
    getNextPageParam: (lastPage: ID[], allPages) => {
      if (lastPage.length < pageSize) return undefined
      return allPages.length * pageSize
    },
    queryFn: async ({ pageParam }) => {
      if (!userId) return []

      const sdk = await audiusSdk()

      const { data } = await sdk.users.getAlbumsByUser({
        id: Id.parse(userId),
        userId: OptionalId.parse(currentUserId),
        limit: pageSize,
        offset: pageParam as number,
        sortMethod,
        query
      })

      const collections = transformAndCleanList(
        data,
        userCollectionMetadataFromSDK
      )

      primeCollectionData({ collections, queryClient })

      return collections.map((collection) => collection.playlist_id)
    },
    select: (data) => data.pages.flat(),
    ...options,
    ...entityCacheOptions,
    enabled: options?.enabled !== false && !!userId
  })

  const {
    data: collections,
    isPending: isCollectionsPending,
    isLoading: isCollectionsLoading
  } = useCollections(queryRes.data)

  // The ID query can resolve before the per-collection entity queries do; if
  // we only reported `queryRes.isPending` the consumer would see an empty
  // `data` array in that gap and flash a "no albums" state.
  const hasPendingCollections =
    (queryRes.data?.length ?? 0) > 0 && isCollectionsPending

  return {
    data: collections,
    isPending: queryRes.isPending || hasPendingCollections,
    isLoading: queryRes.isLoading || (hasPendingCollections && isCollectionsLoading),
    hasNextPage: queryRes.hasNextPage,
    isFetchingNextPage: queryRes.isFetchingNextPage,
    fetchNextPage: queryRes.fetchNextPage
  }
}
