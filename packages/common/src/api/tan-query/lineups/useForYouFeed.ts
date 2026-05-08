import { EntityType, Id } from '@audius/sdk'
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'

import { transformAndCleanList, userFeedItemFromSDK } from '~/adapters'
import { useQueryContext } from '~/api/tan-query/utils'
import { ID, UserCollectionMetadata, UserTrackMetadata } from '~/models'

import { QUERY_KEYS } from '../queryKeys'
import { LineupData, QueryKey, QueryOptions } from '../types'
import { useCurrentUserId } from '../users/account/useCurrentUserId'
import { makeLoadNextPage } from '../utils/infiniteQueryLoadNextPage'
import { primeCollectionData } from '../utils/primeCollectionData'
import { primeTrackData } from '../utils/primeTrackData'

export const FOR_YOU_INITIAL_PAGE_SIZE = 10
export const FOR_YOU_LOAD_MORE_PAGE_SIZE = 10

type ForYouFeedArgs = {
  initialPageSize?: number
  loadMorePageSize?: number
}

export const getForYouFeedQueryKey = (userId: ID | null | undefined) => {
  return [QUERY_KEYS.forYouFeed, userId] as unknown as QueryKey<
    (UserTrackMetadata | UserCollectionMetadata)[]
  >
}

/**
 * "For You" personalized feed. Calls the server-ranked
 * `GET /v1/users/{id}/feed/for-you` endpoint and exposes the result as
 * a paginated lineup. Pagination via offset; the underlying response
 * shape is shared with `getUserFeed`, so items are mixed tracks +
 * collections and we filter to track ids for the lineup consumer.
 */
export const useForYouFeed = (
  {
    initialPageSize = FOR_YOU_INITIAL_PAGE_SIZE,
    loadMorePageSize = FOR_YOU_LOAD_MORE_PAGE_SIZE
  }: ForYouFeedArgs = {},
  options?: QueryOptions
) => {
  const { data: currentUserId } = useCurrentUserId()
  const { audiusSdk } = useQueryContext()
  const queryClient = useQueryClient()

  const queryKey = getForYouFeedQueryKey(currentUserId)

  const query = useInfiniteQuery({
    initialPageParam: 0,
    getNextPageParam: (lastPage: LineupData[], allPages) => {
      const isFirstPage = allPages.length === 1
      const currentPageSize = isFirstPage ? initialPageSize : loadMorePageSize
      if (lastPage.length < currentPageSize) return undefined
      return allPages.reduce((total, page) => total + page.length, 0)
    },
    queryKey,
    queryFn: async ({ pageParam }) => {
      const isFirstPage = pageParam === 0
      const currentPageSize = isFirstPage ? initialPageSize : loadMorePageSize
      const sdk = await audiusSdk()
      const { data = [] } = await sdk.users.getUserForYouFeed({
        id: Id.parse(currentUserId),
        userId: Id.parse(currentUserId),
        limit: currentPageSize,
        offset: pageParam,
        withUsers: true
      })

      const feed = transformAndCleanList(data, userFeedItemFromSDK).map(
        ({ item }) => item
      )

      const { tracks, collections } = feed.reduce(
        (acc, item) => {
          if ('track_id' in item) {
            acc.tracks.push(item)
          } else {
            acc.collections.push(item)
          }
          return acc
        },
        {
          tracks: [] as UserTrackMetadata[],
          collections: [] as UserCollectionMetadata[]
        }
      )

      primeTrackData({ tracks, queryClient })
      primeCollectionData({ collections, queryClient })

      return feed.map((item) =>
        'track_id' in item
          ? { id: item.track_id, type: EntityType.TRACK }
          : { id: item.playlist_id, type: EntityType.PLAYLIST }
      )
    },
    select: (data) => data?.pages.flat(),
    ...options,
    enabled: options?.enabled !== false && currentUserId !== null
  })

  const data = query.data ?? []
  const trackIds = data
    .filter((d) => d.type === EntityType.TRACK)
    .map((d) => d.id as ID)

  return {
    data,
    trackIds,
    isPending: query.isPending,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isSuccess: query.isSuccess,
    isError: query.isError,
    isInitialLoading: query.isInitialLoading,
    hasNextPage: query.hasNextPage,
    fetchNextPage: query.fetchNextPage,
    loadNextPage: makeLoadNextPage(query),
    refetch: query.refetch,
    queryKey
  }
}
