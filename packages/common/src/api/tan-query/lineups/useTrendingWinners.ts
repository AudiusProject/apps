import type { full, Track } from '@audius/sdk'
import { OptionalId } from '@audius/sdk'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import { userTrackMetadataFromSDK } from '~/adapters/track'
import { transformAndCleanList } from '~/adapters/utils'
import { useQueryContext } from '~/api/tan-query/utils'

import { QUERY_KEYS } from '../queryKeys'
import { QueryOptions } from '../types'
import { useCurrentUserId } from '../users/account/useCurrentUserId'
import { primeTrackData } from '../utils/primeTrackData'

type WinnersType = 'tracks' | 'underground'

export type UseTrendingWinnersArgs = {
  week?: string | null
  type: WinnersType
}

export const getTrendingWinnersQueryKey = ({
  week,
  type
}: UseTrendingWinnersArgs) => [
  QUERY_KEYS.trendingWinners,
  week ?? 'latest',
  type
]

/**
 * Maps default API Track (from sdk.tracks) to full.TrackFull-like structure
 * for userTrackMetadataFromSDK. The default Track has user but not userId.
 */
const toTrackFullLike = (t: Track): full.TrackFull | null => {
  const user = t.user as full.UserFull | undefined
  if (!user?.id) return null
  const trackWithUserId = {
    ...t,
    userId: user.id,
    coverArtCids:
      (t as { coverArtCids?: unknown }).coverArtCids ?? t.coverArtSizes,
    trackSegments: Array.isArray(t.trackSegments) ? t.trackSegments : []
  }
  return trackWithUserId as unknown as full.TrackFull
}

export const useTrendingWinners = (
  { week, type }: UseTrendingWinnersArgs,
  options?: QueryOptions
) => {
  const { audiusSdk } = useQueryContext()
  const { data: currentUserId } = useCurrentUserId()
  const queryClient = useQueryClient()

  return useQuery({
    queryKey: getTrendingWinnersQueryKey({ week, type }),
    queryFn: async () => {
      const sdk = await audiusSdk()

      const params = {
        week: week ? new Date(week + 'T12:00:00Z') : undefined,
        userId: OptionalId.parse(currentUserId)
      }

      const response =
        type === 'underground'
          ? await sdk.tracks.getTrendingUndergroundWinners(params)
          : await sdk.tracks.getTrendingWinners(params)

      const sdkResponse = response?.data ?? []

      const trackFullLike = sdkResponse
        .map(toTrackFullLike)
        .filter((t): t is full.TrackFull => t !== null)

      const tracks = transformAndCleanList(
        trackFullLike,
        userTrackMetadataFromSDK
      )

      primeTrackData({ tracks, queryClient })

      return tracks
    },
    ...options,
    enabled: options?.enabled !== false
  })
}
