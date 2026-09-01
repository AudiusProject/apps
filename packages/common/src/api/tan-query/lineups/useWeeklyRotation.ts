import { Id, OptionalId, EntityType } from '@audius/sdk'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import { transformAndCleanList, userTrackMetadataFromSDK } from '~/adapters'
import { useQueryContext } from '~/api/tan-query/utils'
import { ID } from '~/models/Identifiers'

import { QUERY_KEYS } from '../queryKeys'
import { QueryKey, QueryOptions, LineupData } from '../types'
import { useCurrentUserId } from '../users/account/useCurrentUserId'
import { primeTrackData } from '../utils/primeTrackData'

const DEFAULT_LIMIT = 30

// The server recomputes at the ISO week boundary and caches for hours, so
// anything on this order is cheap. Bounded rather than Infinity so a transient
// failure or an empty response doesn't stick for the whole session.
const STALE_TIME_MS = 30 * 60 * 1000

export type UseWeeklyRotationArgs = {
  limit?: number
}

export const getWeeklyRotationQueryKey = ({
  userId,
  limit = DEFAULT_LIMIT
}: UseWeeklyRotationArgs & { userId: ID | null | undefined }) =>
  [QUERY_KEYS.weeklyRotation, userId, { limit }] as unknown as QueryKey<
    LineupData[]
  >

/**
 * The current user's Weekly Rotation mix: tracks they haven't heard, weighted
 * toward artists they don't already follow.
 *
 * Deliberately a plain `useQuery` rather than an infinite one — the mix is a
 * fixed-size artifact, not a lineup you scroll. There is no page 2.
 *
 * The server holds the mix constant for the ISO week, so the client cache can
 * be long-lived -- but NOT infinite. With staleTime: Infinity and
 * refetchOnMount: false, a single failed or empty first fetch was permanent for
 * the session: nothing retried it, and the surfaces that hide themselves on an
 * empty result stayed hidden until the app restarted. A bounded staleTime keeps
 * the request count low while still letting a bad result heal.
 */
export const useWeeklyRotation = (
  { limit = DEFAULT_LIMIT }: UseWeeklyRotationArgs = {},
  options?: QueryOptions
) => {
  const { audiusSdk } = useQueryContext()
  const { data: currentUserId } = useCurrentUserId()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: getWeeklyRotationQueryKey({ userId: currentUserId, limit }),
    queryFn: async () => {
      const sdk = await audiusSdk()
      const { data = [] } = await sdk.users.getWeeklyRotation({
        id: Id.parse(currentUserId),
        limit,
        userId: OptionalId.parse(currentUserId)
      })
      const tracks = transformAndCleanList(data, userTrackMetadataFromSDK)
      primeTrackData({ tracks, queryClient })
      return tracks.map((t) => ({
        id: t.track_id,
        type: EntityType.TRACK
      }))
    },
    staleTime: STALE_TIME_MS,
    ...options,
    enabled: options?.enabled !== false && !!currentUserId
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
    isError: query.isError
  }
}
