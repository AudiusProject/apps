import { OptionalId } from '@audius/sdk'
import type { full } from '@audius/sdk'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import { userTrackMetadataFromSDK } from '~/adapters/track'
import { transformAndCleanList } from '~/adapters/utils'
import { useQueryContext } from '~/api/tan-query/utils'

import { QUERY_KEYS } from '../queryKeys'
import { useTracks } from '../tracks/useTracks'
import { QueryOptions } from '../types'
import { useCurrentUserId } from '../users/account/useCurrentUserId'
import { entityCacheOptions } from '../utils/entityCacheOptions'
import { primeTrackData } from '../utils/primeTrackData'

type GetTracksByUserHandleArgs = {
  handle: string | null | undefined
  filterTracks?: full.GetTracksByUserHandleFilterTracksEnum
  sort?: 'date' | 'plays'
  limit?: number
  offset?: number
}

export const getUserTracksByHandleQueryKey = (
  args: GetTracksByUserHandleArgs
) => {
  const { handle, filterTracks = 'public', sort = 'date', limit, offset } = args
  return [
    QUERY_KEYS.userTracksByHandle,
    handle,
    {
      filterTracks,
      sort,
      limit,
      offset
    }
  ]
}

export const useUserTracksByHandle = (
  args: GetTracksByUserHandleArgs,
  options?: QueryOptions
) => {
  const { audiusSdk } = useQueryContext()
  const queryClient = useQueryClient()
  const { data: currentUserId } = useCurrentUserId()

  const { handle, filterTracks = 'public', sort = 'date', limit, offset } = args

  const { data: trackIds } = useQuery({
    queryKey: getUserTracksByHandleQueryKey(args),
    queryFn: async () => {
      const sdk = await audiusSdk()
      const { data = [] } = await sdk.full.users.getTracksByUserHandle({
        handle: handle!,
        userId: OptionalId.parse(currentUserId),
        filterTracks,
        sort,
        limit,
        offset
      })

      const tracks = transformAndCleanList(data, userTrackMetadataFromSDK)
      primeTrackData({ tracks, queryClient })

      return tracks.map((track) => track.track_id)
    },
    ...options,
    ...entityCacheOptions,
    enabled: options?.enabled !== false && !!handle
  })

  return useTracks(trackIds)
}
