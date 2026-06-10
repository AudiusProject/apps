import { EntityType, Id, type GetUserFeedFilterEnum } from '@audius/sdk'
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'

import { transformAndCleanList, userFeedItemFromSDK } from '~/adapters'
import { useQueryContext } from '~/api/tan-query/utils'
import {
  FeedFilter,
  UserCollectionMetadata,
  ID,
  UserTrackMetadata
} from '~/models'
import { Nullable } from '~/utils/typeUtils'

import { QUERY_KEYS } from '../queryKeys'
import { LineupData, QueryKey, QueryOptions } from '../types'
import { useCurrentUserId } from '../users/account/useCurrentUserId'
import { makeLoadNextPage } from '../utils/infiniteQueryLoadNextPage'
import { primeCollectionData } from '../utils/primeCollectionData'
import { primeTrackData } from '../utils/primeTrackData'

const filterMap: { [k in FeedFilter]: GetUserFeedFilterEnum } = {
  [FeedFilter.ALL]: 'all',
  [FeedFilter.ORIGINAL]: 'original',
  [FeedFilter.REPOST]: 'repost'
}

type FeedArgs = {
  userId?: Nullable<ID> | undefined
  filter?: FeedFilter
  initialPageSize?: number
  loadMorePageSize?: number
}

export const getFeedQueryKey = ({ userId, filter }: FeedArgs) => {
  return [QUERY_KEYS.feed, userId, { filter }] as unknown as QueryKey<
    (UserTrackMetadata | UserCollectionMetadata)[]
  >
}

export const FEED_INITIAL_PAGE_SIZE = 10
export const FEED_LOAD_MORE_PAGE_SIZE = 4

export const useFeed = (
  {
    filter = FeedFilter.ALL,
    initialPageSize = FEED_INITIAL_PAGE_SIZE,
    loadMorePageSize = FEED_LOAD_MORE_PAGE_SIZE
  }: FeedArgs,
  options?: QueryOptions
) => {
  const { data: currentUserId } = useCurrentUserId()
  const { audiusSdk } = useQueryContext()
  const queryClient = useQueryClient()

  const queryKey = getFeedQueryKey({ userId: currentUserId, filter })

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
      const { data = [] } = await sdk.users.getUserFeed({
        id: Id.parse(currentUserId),
        userId: Id.parse(currentUserId),
        filter: filterMap[filter],
        limit: currentPageSize,
        offset: pageParam,
        withUsers: true
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

      // Prime caches
      primeTrackData({ tracks, queryClient })
      primeCollectionData({ collections, queryClient })

      return feed.map((item) =>
        'track_id' in item
          ? { id: item.track_id, type: EntityType.TRACK }
          : { id: item.playlist_id, type: EntityType.PLAYLIST }
      )
    },
    select: (data) => data?.pages.flat(),
    // Keep the loaded feed stable for 5 minutes. Without a staleTime the
    // react-query default of 0 causes the query to refetch on the next
    // mount/focus right after the first paint. If that refetch settles
    // empty (transient backend result, or a different validator node in
    // the fleet returning nothing), react-query replaces the populated
    // feed with `[]` — the same blank-feed bug fixed in useForYouFeed
    // via staleTime: Infinity. 5 minutes is used here instead because
    // the "Latest" feed is chronological and users expect fresh content
    // when they return after a while; Infinity would suppress that.
    // Callers can override via options.staleTime if needed.
    staleTime: 5 * 60 * 1000,
    ...options,
    // Require a fully-resolved id (`!= null` excludes `undefined`). While
    // the account is still loading `currentUserId` is `undefined`; running
    // the query then would cache `[]` under the `[feed, undefined]` key —
    // an entry a later render could briefly surface as "no content".
    enabled: options?.enabled !== false && currentUserId != null
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
