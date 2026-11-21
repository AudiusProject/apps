import { useEffect, useMemo } from 'react'

import { EntityType } from '@audius/sdk'
import { useDispatch } from 'react-redux'

import { useRemixContestWinners } from '~/api/tan-query/events/useRemixContestWinners'
import { ID } from '~/models'
import { remixesPageActions } from '~/store/pages'

import { LineupData, QueryOptions } from '../types'
import { makeLoadNextPage } from '../utils/infiniteQueryLoadNextPage'

import {
  UseRemixesArgs,
  useRemixes,
  useRemixesCount,
  getRemixesQueryKey
} from './useRemixes'

const DEFAULT_PAGE_SIZE = 10

export const useRemixesLineup = (
  {
    trackId,
    includeOriginal = false,
    includeWinners = false,
    pageSize = DEFAULT_PAGE_SIZE,
    sortMethod = 'recent',
    isCosign = false,
    isContestEntry = false
  }: UseRemixesArgs,
  options?: QueryOptions
) => {
  const dispatch = useDispatch()

  const { data: winnerIds, isLoading: isWinnersLoading } =
    useRemixContestWinners(trackId, {
      enabled: options?.enabled !== false && includeWinners
    })

  useEffect(() => {
    if (trackId) {
      dispatch(remixesPageActions.fetchTrackSucceeded({ trackId }))
    }
  }, [dispatch, trackId])

  const queryData = useRemixes(
    {
      trackId,
      includeOriginal,
      includeWinners,
      pageSize,
      sortMethod,
      isCosign,
      isContestEntry
    },
    {
      ...options,
      enabled:
        options?.enabled !== false &&
        !!trackId &&
        (!includeWinners || !isWinnersLoading)
    }
  )

  const { data: count } = useRemixesCount(
    { trackId, isCosign, isContestEntry },
    {
      enabled: options?.enabled !== false && !!trackId
    }
  )

  const processedLineupData: LineupData[] = useMemo(() => {
    const remixTracks = queryData.data?.pages.flat() ?? []

    const orderedTracks: LineupData[] = []

    if (includeOriginal && trackId) {
      orderedTracks.push({ id: trackId, type: EntityType.TRACK })
    }

    if (includeWinners && winnerIds?.length) {
      const winnerTracks = winnerIds.map((id) => ({
        id,
        type: EntityType.TRACK
      }))
      orderedTracks.push(...winnerTracks)
    }

    const remainingTracks = remixTracks.filter((track) => track.id !== trackId)
    orderedTracks.push(...remainingTracks)

    return orderedTracks
  }, [
    queryData.data?.pages,
    includeOriginal,
    includeWinners,
    trackId,
    winnerIds
  ])

  const queryKey = getRemixesQueryKey({
    trackId,
    includeOriginal,
    includeWinners,
    pageSize,
    sortMethod,
    isCosign,
    isContestEntry
  })

  const trackIds = useMemo(
    () =>
      processedLineupData
        .filter((d) => d.type === EntityType.TRACK)
        .map((d) => d.id as ID),
    [processedLineupData]
  )

  return {
    data: processedLineupData,
    count,
    trackIds,
    queryKey,
    pageSize,
    loadNextPage: makeLoadNextPage(queryData),
    hasNextPage: queryData.hasNextPage,
    isLoading: queryData.isLoading,
    isPending: queryData.isPending,
    isError: queryData.isError,
    isFetching: queryData.isFetching,
    isSuccess: queryData.isSuccess
  }
}
