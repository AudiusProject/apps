import { useMemo } from 'react'

import { ID } from '~/models'

import { useTracks } from '../tracks/useTracks'
import { QueryOptions } from '../types'

import { useRemixContest } from './useRemixContest'

export const useRemixContestWinners = (
  trackId: number | null | undefined,
  options?: QueryOptions
) => {
  const { data: remixContest, isLoading: isContestLoading } = useRemixContest(
    trackId,
    {
      enabled: options?.enabled !== false && !!trackId
    }
  )

  const winnerIds = useMemo(
    () => remixContest?.eventData?.winners ?? [],
    [remixContest?.eventData?.winners]
  )

  const {
    isLoading: isTracksLoading,
    isPending: isTracksPending,
    isFetching: isTracksFetching
  } = useTracks(winnerIds, {
    enabled: options?.enabled !== false && winnerIds.length > 0
  })

  return {
    data: winnerIds as ID[],
    isLoading: isContestLoading || isTracksLoading,
    isPending: isContestLoading || isTracksPending,
    isFetching: isContestLoading || isTracksFetching
  }
}
