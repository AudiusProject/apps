import { useEffect, useMemo } from 'react'

import { EntityType } from '@audius/sdk'
import { useQueryClient } from '@tanstack/react-query'
import { useDispatch } from 'react-redux'

import { useQueryContext } from '~/api/tan-query/utils'
import { PlaybackSource } from '~/models/Analytics'
import { ID } from '~/models/Identifiers'
import {
  exclusiveTracksPageLineupActions,
  exclusiveTracksPageSelectors
} from '~/store/pages'

import {
  mapLineupDataToFullLineupItems,
  useLineupQuery
} from '../lineups/useLineupQuery'
import { QueryOptions } from '../types'

import {
  getExclusiveTracksQueryKey,
  useExclusiveTracks
} from './useExclusiveTracks'

const DEFAULT_PAGE_SIZE = 10

type UseExclusiveTracksLineupArgs = {
  userId: ID | null | undefined
  pageSize?: number
}

export const useExclusiveTracksLineup = (
  { userId, pageSize = DEFAULT_PAGE_SIZE }: UseExclusiveTracksLineupArgs,
  options?: QueryOptions
) => {
  const { reportToSentry } = useQueryContext()
  const queryClient = useQueryClient()
  const dispatch = useDispatch()

  const { data: tracks, status } = useExclusiveTracks(
    {
      userId,
      gateConditions: ['token'],
      limit: 100 // Fetch all at once for now
    },
    options
  )

  // Convert tracks to LineupData format
  const processedLineupData = useMemo(() => {
    if (!tracks) return []
    return tracks.map((track) => ({
      id: track.track_id,
      type: EntityType.TRACK
    }))
  }, [tracks])

  useEffect(() => {
    if (processedLineupData.length > 0) {
      const fullLineupItems = mapLineupDataToFullLineupItems(
        processedLineupData,
        queryClient,
        reportToSentry,
        'exclusive-tracks'
      )

      dispatch(
        exclusiveTracksPageLineupActions.fetchLineupMetadatas(
          0,
          fullLineupItems.length,
          false,
          {
            items: fullLineupItems
          }
        )
      )
    }
  }, [processedLineupData, dispatch, queryClient, reportToSentry])

  const queryKey = getExclusiveTracksQueryKey({
    userId,
    gateConditions: ['token']
  })

  // Create a mock infinite query result for compatibility with useLineupQuery
  const mockQueryData = {
    data: processedLineupData,
    status,
    isPending: status === 'pending',
    isLoading: status === 'pending',
    isInitialLoading: status === 'pending',
    isFetching: status === 'pending',
    isSuccess: status === 'success',
    isError: status === 'error',
    hasNextPage: false,
    fetchNextPage: () => Promise.resolve({} as any)
  }

  return useLineupQuery({
    lineupData: processedLineupData,
    queryData: mockQueryData,
    queryKey,
    lineupActions: exclusiveTracksPageLineupActions,
    lineupSelector: exclusiveTracksPageSelectors.getLineup,
    playbackSource: PlaybackSource.EXCLUSIVE_TRACKS_PAGE,
    pageSize,
    disableAutomaticCacheHandling: true
  })
}
