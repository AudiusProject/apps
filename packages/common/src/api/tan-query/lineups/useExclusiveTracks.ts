import { EntityType, OptionalId } from '@audius/sdk'
import {
  InfiniteData,
  useInfiniteQuery,
  useQuery,
  useQueryClient
} from '@tanstack/react-query'
import { useDispatch } from 'react-redux'

import { transformAndCleanList, userTrackMetadataFromSDK } from '~/adapters'
import { useQueryContext } from '~/api/tan-query/utils'
import { PlaybackSource } from '~/models/Analytics'
import { ID } from '~/models/Identifiers'
import {
  exclusiveTracksPageSelectors,
  exclusiveTracksPageLineupActions
} from '~/store/pages'

import { QUERY_KEYS } from '../queryKeys'
import { QueryKey, LineupData, QueryOptions } from '../types'
import { useCurrentUserId } from '../users/account/useCurrentUserId'
import { primeTrackData } from '../utils/primeTrackData'

import { useLineupQuery } from './useLineupQuery'

const DEFAULT_PAGE_SIZE = 10

type GateCondition = 'ungated' | 'usdc_purchase' | 'follow' | 'tip' | 'token'

type UseExclusiveTracksArgs = {
  userId: ID | null | undefined
  gateConditions?: GateCondition[]
  pageSize?: number
  initialPageSize?: number
}

export const getExclusiveTracksQueryKey = ({
  userId,
  gateConditions = ['token'],
  pageSize
}: UseExclusiveTracksArgs) =>
  [
    QUERY_KEYS.exclusiveTracks,
    userId,
    { gateConditions, pageSize }
  ] as unknown as QueryKey<InfiniteData<LineupData[]>>

export const useExclusiveTracks = (
  {
    userId,
    gateConditions = ['token'],
    pageSize = DEFAULT_PAGE_SIZE,
    initialPageSize
  }: UseExclusiveTracksArgs,
  options?: QueryOptions
) => {
  const { audiusSdk } = useQueryContext()
  const { data: currentUserId } = useCurrentUserId()
  const queryClient = useQueryClient()
  const dispatch = useDispatch()

  const queryData = useInfiniteQuery({
    queryKey: getExclusiveTracksQueryKey({
      userId,
      gateConditions,
      pageSize
    }),
    initialPageParam: 0,
    getNextPageParam: (lastPage: LineupData[], allPages) => {
      if (lastPage.length < pageSize) return undefined
      return allPages.length * pageSize
    },
    queryFn: async ({ pageParam }) => {
      const sdk = await audiusSdk()
      const { data: tracks = [] } = await sdk.full.users.getTracksByUser({
        id: OptionalId.parse(userId)!,
        userId: OptionalId.parse(currentUserId),
        gateCondition: gateConditions as any,
        limit: pageSize,
        offset: pageParam
      })

      const processedTracks = transformAndCleanList(
        tracks,
        userTrackMetadataFromSDK
      )
      primeTrackData({ tracks: processedTracks, queryClient })

      // Update lineup when new data arrives
      dispatch(
        exclusiveTracksPageLineupActions.fetchLineupMetadatas(
          pageParam,
          pageSize,
          false,
          { items: processedTracks }
        )
      )

      return processedTracks.map((t) => ({
        id: t.track_id,
        type: EntityType.TRACK
      }))
    },
    select: (data) => data?.pages.flat(),
    ...options,
    enabled: options?.enabled !== false && !!userId
  })

  return useLineupQuery({
    lineupData: queryData.data ?? [],
    queryData,
    queryKey: getExclusiveTracksQueryKey({
      userId,
      gateConditions,
      pageSize
    }),
    lineupActions: exclusiveTracksPageLineupActions,
    lineupSelector: exclusiveTracksPageSelectors.getLineup,
    playbackSource: PlaybackSource.EXCLUSIVE_TRACKS_PAGE,
    pageSize,
    initialPageSize
  })
}

// Hook to get the count of exclusive tracks
export const useExclusiveTracksCount = (args: {
  userId: ID | null | undefined
  gateConditions?: GateCondition[]
  enabled?: boolean
}) => {
  const { userId, gateConditions = ['token'], enabled = true } = args
  const { audiusSdk } = useQueryContext()
  const { data: currentUserId } = useCurrentUserId()

  return useQuery({
    queryKey: [QUERY_KEYS.exclusiveTracksCount, userId, { gateConditions }],
    queryFn: async () => {
      const sdk = await audiusSdk()
      const { data: count } = await sdk.full.users.getTracksCountByUser({
        id: OptionalId.parse(userId)!,
        userId: OptionalId.parse(currentUserId),
        gateCondition: gateConditions as any
      })

      return count ?? 0
    },
    enabled: enabled && !!userId
  })
}
