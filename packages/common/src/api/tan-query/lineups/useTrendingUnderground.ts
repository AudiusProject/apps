import { OptionalId, EntityType } from '@audius/sdk'
import {
  InfiniteData,
  useInfiniteQuery,
  useQueryClient
} from '@tanstack/react-query'
import { useDispatch } from 'react-redux'

import { transformAndCleanList, userTrackMetadataFromSDK } from '~/adapters'
import { useQueryContext } from '~/api/tan-query/utils'
import { PlaybackSource } from '~/models/Analytics'
import {
  trendingUndergroundPageLineupActions,
  trendingUndergroundPageLineupSelectors
} from '~/store/pages'

import { QUERY_KEYS } from '../queryKeys'
import { QueryKey, QueryOptions, LineupData } from '../types'
import { useCurrentUserId } from '../users/account/useCurrentUserId'
import { primeTrackData } from '../utils/primeTrackData'

import { useLineupQuery } from './useLineupQuery'

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
  const dispatch = useDispatch()

  const queryData = useInfiniteQuery({
    queryKey: getTrendingUndergroundQueryKey({ pageSize }),
    initialPageParam: 0,
    getNextPageParam: (lastPage: LineupData[], allPages) => {
      if (lastPage.length < pageSize) return undefined
      return allPages.length * pageSize
    },
    queryFn: async ({ pageParam }) => {
      const sdk = await audiusSdk()

      const { data = [] } = await sdk.full.tracks.getUndergroundTrendingTracks({
        offset: pageParam,
        limit: pageSize,
        userId: OptionalId.parse(currentUserId)
      })

      const tracks = transformAndCleanList(data, userTrackMetadataFromSDK)

      primeTrackData({ tracks, queryClient })

      // Update lineup when new data arrives
      dispatch(
        trendingUndergroundPageLineupActions.fetchLineupMetadatas(
          pageParam,
          pageSize,
          false,
          { tracks }
        )
      )

      return tracks.map((t) => ({
        id: t.track_id,
        type: EntityType.TRACK
      }))
    },
    select: (data) => data?.pages.flat(),
    ...options,
    enabled: options?.enabled !== false
  })

  return useLineupQuery({
    lineupData: queryData.data ?? [],
    queryData,
    queryKey: getTrendingUndergroundQueryKey({
      pageSize
    }),
    lineupActions: trendingUndergroundPageLineupActions,
    lineupSelector: trendingUndergroundPageLineupSelectors.getLineup,
    playbackSource: PlaybackSource.TRACK_TILE,
    pageSize
  })
}
