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
  return [QUERY_KEYS.forYouFeed, userId] as unknown as QueryKey<LineupData[]>
}

/**
 * "For You" feed for the Feed page. Backed by the dedicated
 * `GET /v1/users/{id}/feed/for-you` endpoint — a lean 6-source pipeline
 * (in-network, trending, underground × tracks + playlists) with linear
 * ranking and a shared per-owner diversity pass. Returns a heterogenous
 * feed of tracks and playlists/albums, mirroring the chronological feed
 * shape; consumers that only render tracks can use `trackIds`.
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
    queryFn: async ({ pageParam }): Promise<LineupData[]> => {
      if (!currentUserId) return []
      const isFirstPage = pageParam === 0
      const currentPageSize = isFirstPage ? initialPageSize : loadMorePageSize
      const sdk = await audiusSdk()
      const { data = [] } = await sdk.users.getUserForYouFeed({
        id: Id.parse(currentUserId),
        userId: Id.parse(currentUserId),
        limit: currentPageSize,
        offset: pageParam
      })

      const feed = transformAndCleanList(data, userFeedItemFromSDK).map(
        ({ item }) => item
      )
      if (feed === null) return []

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

      // Prime caches so tile renders don't have to re-fetch
      primeTrackData({ tracks, queryClient })
      primeCollectionData({ collections, queryClient })

      return feed.map((item) =>
        'track_id' in item
          ? { id: item.track_id, type: EntityType.TRACK }
          : { id: item.playlist_id, type: EntityType.PLAYLIST }
      )
    },
    select: (data) => data?.pages.flat(),
    staleTime: Infinity,
    ...options,
    enabled: options?.enabled !== false && currentUserId != null
  })

  const data = query.data ?? []
  const trackIds = data
    .filter((d) => d.type === EntityType.TRACK)
    .map((d) => d.id as ID)

  // When the query is disabled, react-query keeps isPending/isLoading true
  // (data is undefined). Surface them as false so consumers can render an
  // empty state instead of an indefinite loading state.
  const isDisabled = currentUserId == null || options?.enabled === false

  return {
    data,
    trackIds,
    isPending: isDisabled ? false : query.isPending,
    isLoading: isDisabled ? false : query.isLoading,
    isFetching: query.isFetching,
    isSuccess: query.isSuccess,
    isError: query.isError,
    isInitialLoading: isDisabled ? false : query.isInitialLoading,
    hasNextPage: query.hasNextPage,
    fetchNextPage: query.fetchNextPage,
    loadNextPage: makeLoadNextPage(query),
    refetch: query.refetch,
    queryKey
  }
}
