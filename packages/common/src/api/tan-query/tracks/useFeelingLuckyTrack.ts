import { useQuery, useQueryClient } from '@tanstack/react-query'

import { userTrackMetadataFromSDK } from '~/adapters/track'
import { transformAndCleanList } from '~/adapters/utils'
import { primeTrackData, useQueryContext } from '~/api/tan-query/utils'
import { ID } from '~/models'

import { TQTrack } from '../models'
import { QUERY_KEYS } from '../queryKeys'
import { QueryKey, SelectableQueryOptions } from '../types'
import { useCurrentUserId } from '../users/account/useCurrentUserId'

export type UseFeelingLuckyTracksArgs = {
  userId: ID | null | undefined
  limit?: number
}

export const getFeelingLuckyTracksQueryKey = ({
  userId,
  limit
}: UseFeelingLuckyTracksArgs) => {
  return [
    QUERY_KEYS.feelingLuckyTracks,
    userId,
    limit
  ] as unknown as QueryKey<TQTrack>
}

export const useFeelingLuckyTracks = <TResult = TQTrack[]>(
  args?: { limit?: number },
  options?: SelectableQueryOptions<TQTrack[], TResult>
) => {
  const { audiusSdk } = useQueryContext()
  const { data: currentUserId } = useCurrentUserId()
  const queryClient = useQueryClient()
  const { limit } = args || {}

  return useQuery({
    queryKey: getFeelingLuckyTracksQueryKey({ userId: currentUserId, limit }),
    queryFn: async () => {
      const sdk = await audiusSdk()
      const { data = [] } = await sdk.full.tracks.getFeelingLuckyTracks({
        limit
      })
      const tracks = transformAndCleanList(data, userTrackMetadataFromSDK)

      primeTrackData({
        tracks,
        queryClient
      })
      return tracks
    },
    ...options,
    enabled: options?.enabled !== false
  })
}
