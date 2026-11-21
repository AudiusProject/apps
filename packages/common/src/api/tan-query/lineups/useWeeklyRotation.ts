import { useMemo } from 'react'

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

const STALE_TIME_MS = 30 * 60 * 1000

export type UseWeeklyRotationArgs = {
  limit?: number
  userId?: ID | null
}

export const getWeeklyRotationQueryKey = ({
  userId,
  limit = DEFAULT_LIMIT
}: Omit<UseWeeklyRotationArgs, 'userId'> & { userId: ID | null | undefined }) =>
  [QUERY_KEYS.weeklyRotation, userId, { limit }] as unknown as QueryKey<
    LineupData[]
  >

export const useWeeklyRotation = (
  { limit = DEFAULT_LIMIT, userId: userIdArg }: UseWeeklyRotationArgs = {},
  options?: QueryOptions
) => {
  const { audiusSdk } = useQueryContext()
  const { data: currentUserId } = useCurrentUserId()
  const queryClient = useQueryClient()
  const userId = userIdArg ?? currentUserId

  const query = useQuery({
    queryKey: getWeeklyRotationQueryKey({ userId, limit }),
    queryFn: async () => {
      const sdk = await audiusSdk()
      const { data = [] } = await sdk.users.getWeeklyRotation({
        id: Id.parse(userId),
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
    enabled: options?.enabled !== false && !!userId
  })

  const data = useMemo(() => query.data ?? [], [query.data])
  const trackIds = useMemo(
    () =>
      data.filter((d) => d.type === EntityType.TRACK).map((d) => d.id as ID),
    [data]
  )

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
