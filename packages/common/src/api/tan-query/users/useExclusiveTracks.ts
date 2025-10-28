import { OptionalId } from '@audius/sdk'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import { userTrackMetadataFromSDK } from '~/adapters/track'
import { transformAndCleanList } from '~/adapters/utils'
import { useQueryContext } from '~/api/tan-query/utils'
import { ID } from '~/models/Identifiers'

import { QUERY_KEYS } from '../queryKeys'
import { useTracks } from '../tracks/useTracks'
import { QueryOptions } from '../types'
import { useCurrentUserId } from '../users/account/useCurrentUserId'
import { entityCacheOptions } from '../utils/entityCacheOptions'
import { primeTrackData } from '../utils/primeTrackData'

type GateCondition =
  | 'ungated'
  | 'usdc_purchase'
  | 'follow'
  | 'tip'
  | 'nft'
  | 'token'

type UseExclusiveTracksArgs = {
  userId: ID | null | undefined
  gateConditions: GateCondition[]
  limit?: number
  offset?: number
  enabled?: boolean
}

type UseExclusiveTracksCountArgs = {
  userId: ID | null | undefined
  gateConditions: GateCondition[]
  enabled?: boolean
}

export const getExclusiveTracksQueryKey = (args: UseExclusiveTracksArgs) => {
  const { userId, gateConditions, limit, offset } = args
  return [QUERY_KEYS.exclusiveTracks, userId, { gateConditions, limit, offset }]
}

export const useExclusiveTracks = (
  args: UseExclusiveTracksArgs,
  options?: QueryOptions
) => {
  const { audiusSdk } = useQueryContext()
  const queryClient = useQueryClient()
  const { data: currentUserId } = useCurrentUserId()

  const { userId, gateConditions, limit = 4, offset = 0 } = args

  const { data: trackIds } = useQuery({
    queryKey: getExclusiveTracksQueryKey(args),
    queryFn: async () => {
      const sdk = await audiusSdk()
      const { data = [] } = await sdk.full.users.getTracksByUser({
        id: OptionalId.parse(userId)!,
        userId: OptionalId.parse(currentUserId),
        gateCondition: gateConditions as any,
        limit,
        offset
      })

      const tracks = transformAndCleanList(data, userTrackMetadataFromSDK)
      primeTrackData({ tracks, queryClient })

      return tracks.map((track) => track.track_id)
    },
    ...options,
    ...entityCacheOptions,
    enabled: options?.enabled !== false && !!userId && gateConditions.length > 0
  })

  return useTracks(trackIds)
}

// Hook to get the count of exclusive tracks
export const useExclusiveTracksCount = (args: UseExclusiveTracksCountArgs) => {
  const { userId, gateConditions, enabled = true } = args
  const { audiusSdk } = useQueryContext()
  const { data: currentUserId } = useCurrentUserId()

  return useQuery({
    queryKey: [QUERY_KEYS.exclusiveTracksCount, userId, { gateConditions }],
    queryFn: async () => {
      const sdk = await audiusSdk()
      // We'd need a count endpoint, but for now we can make a rough estimate
      // by fetching with a higher limit
      const { data: allTracks = [] } = await sdk.full.users.getTracksByUser({
        id: OptionalId.parse(userId)!,
        userId: OptionalId.parse(currentUserId),
        gateCondition: gateConditions as any,
        limit: 100,
        offset: 0
      })

      return allTracks.length
    },
    ...entityCacheOptions,
    enabled: enabled && !!userId && gateConditions.length > 0
  })
}
