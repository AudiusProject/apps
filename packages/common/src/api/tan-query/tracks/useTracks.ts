import { useMemo } from 'react'

import { useQueryClient } from '@tanstack/react-query'
import { keyBy } from 'lodash'
import { useDispatch } from 'react-redux'

import { useQueryContext } from '~/api/tan-query/utils'
import { ID } from '~/models/Identifiers'

import { getTracksBatcher } from '../batchers/getTracksBatcher'
import { TQTrack } from '../models'
import { QueryOptions } from '../types'
import { useCurrentUserId } from '../users/account/useCurrentUserId'
import { combineQueryResults } from '../utils/combineQueryResults'
import { entityCacheOptions } from '../utils/entityCacheOptions'
import { useQueries } from '../utils/useQueries'

import { getTrackQueryFn, getTrackQueryKey } from './useTrack'

// This function is only used for batch operations in saga utilities
export const getTracksQueryFn = async (
  trackIds: ID[],
  currentUserId: ID | null,
  queryClient: any,
  sdk: any,
  dispatch: any
) => {
  const batchGetTracks = getTracksBatcher({
    sdk,
    currentUserId,
    queryClient,
    dispatch
  })
  const tracks = await Promise.all(
    trackIds.map((trackId) => batchGetTracks.fetch(trackId))
  )
  return tracks.filter((track): track is TQTrack => !!track)
}

export const useTracks = (
  trackIds: ID[] | null | undefined,
  options?: QueryOptions
) => {
  const { audiusSdk } = useQueryContext()
  const dispatch = useDispatch()
  const queryClient = useQueryClient()
  const { data: currentUserId } = useCurrentUserId()

  // Filter out duplicate IDs. Callers often pass a new array each render, so
  // key on the ids themselves to keep the queries below stable.
  const trackIdsKey = trackIds?.join(',')
  const uniqueTrackIds = useMemo(
    () =>
      trackIds?.filter((id, index, self) => self.indexOf(id) === index && !!id),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [trackIdsKey]
  )

  // Rebuilding these every render makes tanstack re-hash every key and
  // re-sync every observer, so only rebuild when an input changes.
  const queries = useMemo(
    () =>
      uniqueTrackIds?.map((trackId) => ({
        queryKey: getTrackQueryKey(trackId),
        queryFn: async () => {
          const sdk = await audiusSdk()
          return getTrackQueryFn(
            trackId,
            currentUserId,
            queryClient,
            sdk,
            dispatch
          )
        },
        ...entityCacheOptions,
        ...options,
        enabled: options?.enabled !== false && !!trackId && trackId > 0
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      uniqueTrackIds,
      currentUserId,
      audiusSdk,
      queryClient,
      dispatch,
      options?.enabled,
      options?.staleTime,
      options?.placeholderData,
      options?.refetchOnMount,
      options?.throwOnError,
      options?.refetchInterval,
      options?.refetchOnWindowFocus
    ]
  )

  const queryResults = useQueries({
    queries,
    combine: combineQueryResults<TQTrack[]>
  })

  const { data: tracks } = queryResults

  const byId = useMemo(() => keyBy(tracks, 'track_id'), [tracks])

  return {
    data: tracks,
    byId,
    status: queryResults.status,
    isPending: queryResults.isPending,
    isLoading: queryResults.isLoading,
    isFetching: queryResults.isFetching,
    isSuccess: queryResults.isSuccess,
    isError: queryResults.isError
  }
}
