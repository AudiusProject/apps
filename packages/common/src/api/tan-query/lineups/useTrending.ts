import { OptionalId, EntityType } from '@audius/sdk'
import {
  InfiniteData,
  useInfiniteQuery,
  useQueryClient
} from '@tanstack/react-query'

import { userTrackMetadataFromSDK } from '~/adapters/track'
import { transformAndCleanList } from '~/adapters/utils'
import { useQueryContext } from '~/api/tan-query/utils'
import { ID } from '~/models/Identifiers'
import { TimeRange } from '~/models/TimeRange'
import { StringKeys } from '~/services/remote-config'
import { Genre } from '~/utils/genres'

import { QUERY_KEYS } from '../queryKeys'
import { QueryKey, LineupData, QueryOptions } from '../types'
import { useCurrentUserId } from '../users/account/useCurrentUserId'
import { makeLoadNextPage } from '../utils/infiniteQueryLoadNextPage'
import { primeTrackData } from '../utils/primeTrackData'

export const TRENDING_INITIAL_PAGE_SIZE = 10
export const TRENDING_LOAD_MORE_PAGE_SIZE = 4

export type GetTrendingArgs = {
  timeRange: TimeRange
  genre?: Genre | null
  initialPageSize?: number
  loadMorePageSize?: number
}

export const getTrendingQueryKey = ({
  timeRange,
  genre,
  initialPageSize,
  loadMorePageSize
}: GetTrendingArgs) =>
  [
    QUERY_KEYS.trending,
    { timeRange, genre, initialPageSize, loadMorePageSize }
  ] as unknown as QueryKey<InfiniteData<LineupData[]>>

export const useTrending = (
  {
    timeRange = TimeRange.WEEK,
    genre,
    initialPageSize = TRENDING_INITIAL_PAGE_SIZE,
    loadMorePageSize = TRENDING_LOAD_MORE_PAGE_SIZE
  }: GetTrendingArgs,
  options?: QueryOptions
) => {
  const { audiusSdk, remoteConfigInstance } = useQueryContext()
  const queryClient = useQueryClient()
  const { data: currentUserId } = useCurrentUserId()

  const queryKey = getTrendingQueryKey({
    timeRange,
    genre,
    initialPageSize,
    loadMorePageSize
  })

  const query = useInfiniteQuery({
    queryKey,
    initialPageParam: 0,
    getNextPageParam: (lastPage: LineupData[], allPages) => {
      const isFirstPage = allPages.length === 1
      const currentPageSize = isFirstPage ? initialPageSize : loadMorePageSize
      if (lastPage.length < currentPageSize) return undefined
      return allPages.reduce((total, page) => total + page.length, 0)
    },
    queryFn: async ({ pageParam }) => {
      const sdk = await audiusSdk()
      const version = remoteConfigInstance.getRemoteVar(
        StringKeys.TRENDING_EXPERIMENT
      )
      const isFirstPage = pageParam === 0
      const currentPageSize = isFirstPage ? initialPageSize : loadMorePageSize

      const { data: sdkResponse = [] } = version
        ? await sdk.tracks.getTrendingTracksWithVersion({
            time: timeRange,
            genre: (genre as string) || undefined,
            userId: OptionalId.parse(currentUserId),
            limit: currentPageSize,
            offset: pageParam,
            version
          })
        : await sdk.tracks.getTrendingTracks({
            time: timeRange,
            genre: (genre as string) || undefined,
            userId: OptionalId.parse(currentUserId),
            limit: currentPageSize,
            offset: pageParam
          })

      const tracks = transformAndCleanList(
        sdkResponse,
        userTrackMetadataFromSDK
      )

      primeTrackData({ tracks, queryClient })

      return tracks.map((t) => ({
        id: t.track_id,
        type: EntityType.TRACK
      }))
    },
    select: (data) => data?.pages.flat(),
    ...options,
    enabled: options?.enabled !== false && !!timeRange
  })

  const data = query.data ?? []
  const trackIds = data
    .filter((d) => d.type === EntityType.TRACK)
    .map((d) => d.id as ID)

  return {
    // Raw data
    data,
    trackIds,

    // Query state
    isPending: query.isPending,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isSuccess: query.isSuccess,
    isError: query.isError,
    isInitialLoading: query.isInitialLoading,
    hasNextPage: query.hasNextPage,
    fetchNextPage: query.fetchNextPage,
    loadNextPage: makeLoadNextPage(query),

    // Identity
    queryKey
  }
}
