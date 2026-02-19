import { EntityType, Id, type GetUserFeedFilterEnum } from '@audius/sdk'
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { useDispatch } from 'react-redux'

import { transformAndCleanList, userFeedItemFromSDK } from '~/adapters'
import { useQueryContext } from '~/api/tan-query/utils'
import {
  FeedFilter,
  UserCollectionMetadata,
  ID,
  UserTrackMetadata,
  PlaybackSource
} from '~/models'
import { feedPageSelectors, feedPageLineupActions } from '~/store/pages'
import { Nullable } from '~/utils/typeUtils'

import { QUERY_KEYS } from '../queryKeys'
import { LineupData, QueryKey, QueryOptions } from '../types'
import { useCurrentUserId } from '../users/account/useCurrentUserId'
import { primeCollectionData } from '../utils/primeCollectionData'
import { primeTrackData } from '../utils/primeTrackData'

import { useLineupQuery } from './useLineupQuery'

const filterMap: { [k in FeedFilter]: GetUserFeedFilterEnum } = {
  [FeedFilter.ALL]: 'all',
  [FeedFilter.ORIGINAL]: 'original',
  [FeedFilter.REPOST]: 'repost'
}

type FeedArgs = {
  userId: Nullable<ID> | undefined
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
  const dispatch = useDispatch()

  const queryData = useInfiniteQuery({
    initialPageParam: 0,
    getNextPageParam: (lastPage: LineupData[], allPages) => {
      const isFirstPage = allPages.length === 1
      const currentPageSize = isFirstPage ? initialPageSize : loadMorePageSize
      if (lastPage.length < currentPageSize) return undefined
      return allPages.reduce((total, page) => total + page.length, 0)
    },
    queryKey: getFeedQueryKey({ userId: currentUserId, filter }),
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

      // Pass the data to lineup sagas
      dispatch(
        feedPageLineupActions.fetchLineupMetadatas(
          pageParam,
          currentPageSize,
          false,
          { items: feed }
        )
      )

      return feed.map((item) =>
        'track_id' in item
          ? { id: item.track_id, type: EntityType.TRACK }
          : { id: item.playlist_id, type: EntityType.PLAYLIST }
      )
    },
    select: (data) => data?.pages.flat(),
    ...options,
    enabled: currentUserId !== null
  })

  return useLineupQuery({
    lineupData: queryData.data ?? [],
    queryData,
    queryKey: getFeedQueryKey({
      userId: currentUserId,
      filter
    }),
    lineupActions: feedPageLineupActions,
    lineupSelector: feedPageSelectors.getDiscoverFeedLineup,
    playbackSource: PlaybackSource.TRACK_TILE_LINEUP,
    pageSize: loadMorePageSize,
    initialPageSize
  })
}
