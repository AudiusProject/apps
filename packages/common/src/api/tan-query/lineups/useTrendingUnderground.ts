import { OptionalId, EntityType } from '@audius/sdk'
import {
  InfiniteData,
  useInfiniteQuery,
  useQueryClient
} from '@tanstack/react-query'

import { transformAndCleanList, userTrackMetadataFromSDK } from '~/adapters'
import { useQueryContext } from '~/api/tan-query/utils'
import { ID } from '~/models/Identifiers'

import { QUERY_KEYS } from '../queryKeys'
import { QueryKey, QueryOptions, LineupData } from '../types'
import { useCurrentUserId } from '../users/account/useCurrentUserId'
import { makeLoadNextPage } from '../utils/infiniteQueryLoadNextPage'
import { primeTrackData } from '../utils/primeTrackData'

const DEFAULT_PAGE_SIZE = 10

type UseTrendingUndergroundArgs = {
  pageSize?: number
}

export const getTrendingUndergroundQueryKey = ({
  pageSize
}: UseTrendingUndergroundArgs) =>
  [QUERY_KEYS.trendingUnderground, { pageSize }] as unknown as QueryKey<
    InfiniteData<LineupData[]>
  >

export const useTrendingUnderground = (
  { pageSize = DEFAULT_PAGE_SIZE }: UseTrendingUndergroundArgs = {},
  options?: QueryOptions
) => {
  const { audiusSdk } = useQueryContext()
  const { data: currentUserId } = useCurrentUserId()
  const queryClient = useQueryClient()

  const queryKey = getTrendingUndergroundQueryKey({ pageSize })

  const query = useInfiniteQuery({
    queryKey,
    initialPageParam: 0,
    getNextPageParam: (lastPage: LineupData[], allPages) => {
      if (lastPage.length < pageSize) return undefined
      return allPages.length * pageSize
    },
    queryFn: async ({ pageParam }) => {
      const sdk = await audiusSdk()
      const { data = [] } = await sdk.tracks.getUndergroundTrendingTracks({
        offset: pageParam,
        limit: pageSize,
        userId: OptionalId.parse(currentUserId)
      })
      const tracks = transformAndCleanList(data, userTrackMetadataFromSDK)
      primeTrackData({ tracks, queryClient })
      return tracks.map((t) => ({
        id: t.track_id,
        type: EntityType.TRACK
      }))
    },
    select: (data) => data?.pages.flat(),
    ...options,
    enabled: options?.enabled !== false
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
    queryKey
  }
}
