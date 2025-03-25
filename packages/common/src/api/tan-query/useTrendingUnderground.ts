import { OptionalId } from '@audius/sdk'
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { useDispatch } from 'react-redux'

import { transformAndCleanList, userTrackMetadataFromSDK } from '~/adapters'
import { useAudiusQueryContext } from '~/audius-query'
import { PlaybackSource } from '~/models/Analytics'
import { UserTrackMetadata } from '~/models/Track'
import {
  trendingUndergroundPageLineupActions,
  trendingUndergroundPageLineupSelectors
} from '~/store/pages'

import { QUERY_KEYS } from './queryKeys'
import { QueryOptions } from './types'
import { useCurrentUserId } from './useCurrentUserId'
import { primeTrackData } from './utils/primeTrackData'
import { useLineupQuery } from './utils/useLineupQuery'

const DEFAULT_PAGE_SIZE = 10

type UseTrendingUndergroundArgs = {
  pageSize?: number
}

export const getTrendingUndergroundQueryKey = ({
  pageSize
}: UseTrendingUndergroundArgs) => [QUERY_KEYS.trendingUnderground, { pageSize }]

export const useTrendingUnderground = (
  { pageSize = DEFAULT_PAGE_SIZE }: UseTrendingUndergroundArgs = {},
  options?: QueryOptions
) => {
  const { audiusSdk } = useAudiusQueryContext()
  const { data: currentUserId } = useCurrentUserId()
  const queryClient = useQueryClient()
  const dispatch = useDispatch()

  const queryData = useInfiniteQuery({
    queryKey: getTrendingUndergroundQueryKey({ pageSize }),
    initialPageParam: 0,
    getNextPageParam: (lastPage: UserTrackMetadata[], allPages) => {
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

      primeTrackData({ tracks, queryClient, dispatch })

      // Update lineup when new data arrives
      dispatch(
        trendingUndergroundPageLineupActions.fetchLineupMetadatas(
          pageParam,
          pageSize,
          false,
          { tracks }
        )
      )

      return tracks
    },
    select: (data) => data?.pages.flat(),
    ...options,
    enabled: options?.enabled !== false
  })

  return useLineupQuery({
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
