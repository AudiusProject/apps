import { EntityType, OptionalId } from '@audius/sdk'
import {
  InfiniteData,
  useInfiniteQuery,
  useQuery,
  useQueryClient
} from '@tanstack/react-query'

import { transformAndCleanList, userTrackMetadataFromSDK } from '~/adapters'
import { useQueryContext } from '~/api/tan-query/utils'
import { ID } from '~/models/Identifiers'

import { QUERY_KEYS } from '../queryKeys'
import { QueryKey, LineupData, QueryOptions } from '../types'
import { useCurrentUserId } from '../users/account/useCurrentUserId'
import { makeLoadNextPage } from '../utils/infiniteQueryLoadNextPage'
import { primeTrackData } from '../utils/primeTrackData'

const DEFAULT_PAGE_SIZE = 10

type GateCondition = 'ungated' | 'usdc_purchase' | 'follow' | 'token'

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
    pageSize = DEFAULT_PAGE_SIZE
  }: UseExclusiveTracksArgs,
  options?: QueryOptions
) => {
  const { audiusSdk } = useQueryContext()
  const { data: currentUserId } = useCurrentUserId()
  const queryClient = useQueryClient()

  const queryKey = getExclusiveTracksQueryKey({
    userId,
    gateConditions,
    pageSize
  })

  const query = useInfiniteQuery({
    queryKey,
    initialPageParam: 0,
    getNextPageParam: (lastPage: LineupData[], allPages) => {
      if (lastPage.length < pageSize) return undefined
      return allPages.length * pageSize
    },
    queryFn: async ({ pageParam }) => {
      const sdk = await audiusSdk()
      const { data: tracks = [] } = await sdk.users.getTracksByUser({
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

      return processedTracks.map((t) => ({
        id: t.track_id,
        type: EntityType.TRACK
      }))
    },
    select: (data) => data?.pages.flat(),
    ...options,
    enabled: options?.enabled !== false && !!userId
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
      const { data: count } = await sdk.users.getTracksCountByUser({
        id: OptionalId.parse(userId)!,
        userId: OptionalId.parse(currentUserId),
        gateCondition: gateConditions as any
      })

      return count ?? 0
    },
    enabled: enabled && !!userId
  })
}
