import { useMemo } from 'react'

import { AudiusSdkWithServices } from '@audius/sdk'
import { QueryClient, useQuery, useQueryClient } from '@tanstack/react-query'
import { useDispatch } from 'react-redux'
import { AnyAction, Dispatch } from 'redux'

import { useQueryContext } from '~/api/tan-query/utils'
import { ID } from '~/models/Identifiers'

import { getTracksBatcher } from '../batchers/getTracksBatcher'
import { TQTrack } from '../models'
import { QUERY_KEYS } from '../queryKeys'
import { QueryKey, SelectableQueryOptions } from '../types'
import { useCurrentUserId } from '../users/account/useCurrentUserId'
import { entityCacheOptions } from '../utils/entityCacheOptions'

export const getTrackQueryKey = (trackId: ID | null | undefined) => {
  return [QUERY_KEYS.track, trackId] as unknown as QueryKey<TQTrack>
}

export const getTrackQueryFn = async (
  trackId: ID,
  currentUserId: ID | null | undefined,
  queryClient: QueryClient,
  sdk: AudiusSdkWithServices,
  dispatch: Dispatch<AnyAction>
) => {
  const batchGetTracks = getTracksBatcher({
    sdk,
    currentUserId,
    queryClient,
    dispatch
  })
  return await batchGetTracks.fetch(trackId!)
}

export const useTrack = <TResult = TQTrack>(
  trackId: ID | null | undefined,
  options?: SelectableQueryOptions<TQTrack, TResult>
) => {
  const { audiusSdk } = useQueryContext()
  const queryClient = useQueryClient()
  const dispatch = useDispatch()
  const { data: currentUserId } = useCurrentUserId()
  const validTrackId = !!trackId && trackId > 0

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const select = useMemo(() => options?.select, [])

  return useQuery({
    queryKey: getTrackQueryKey(trackId),
    queryFn: async () => {
      const sdk = await audiusSdk()
      const batchGetTracks = getTracksBatcher({
        sdk,
        currentUserId,
        queryClient,
        dispatch
      })
      return await batchGetTracks.fetch(trackId!)
    },
    ...options,
    ...entityCacheOptions,
    select,
    enabled: options?.enabled !== false && validTrackId
  })
}
