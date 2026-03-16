import { useEffect, useCallback } from 'react'

import { EntityType } from '@audius/sdk/services'
import {
  QueryClient,
  QueryKey,
  UseInfiniteQueryResult,
  useQueryClient
} from '@tanstack/react-query'
import { isEqual } from 'lodash'
import { Selector, useDispatch, useSelector } from 'react-redux'
import { usePrevious } from 'react-use'

import { getCollectionQueryKey, getTrackQueryKey } from '~/api'
import { useQueryContext } from '~/api/tan-query/utils'
import {
  Collection,
  Feature,
  ID,
  LineupState,
  LineupTrack,
  PlaybackSource,
  ReportToSentryArgs,
  Status,
  Track,
  UID,
  combineStatuses
} from '~/models'
import { CommonState } from '~/store/commonStore'
import { LineupActions } from '~/store/lineup/actions'
import { getPlaying } from '~/store/player/selectors'

import { TQCollection, TQTrack } from '../models'
import { LineupData } from '../types'
import { makeLoadNextPage } from '../utils/infiniteQueryLoadNextPage'

type PartialQueryData<T> = Pick<
  UseInfiniteQueryResult<T>,
  | 'isInitialLoading'
  | 'hasNextPage'
  | 'isLoading'
  | 'isPending'
  | 'isError'
  | 'isFetching'
  | 'isSuccess'
  | 'fetchNextPage'
>

export const mapLineupDataToFullLineupItems = (
  lineupData: LineupData[],
  queryClient: QueryClient,
  reportToSentry: (args: ReportToSentryArgs) => void,
  lineupPrefix: string
) => {
  return lineupData
    ?.map((item) => {
      if (item.type === EntityType.TRACK) {
        const track = queryClient.getQueryData<TQTrack>(
          getTrackQueryKey(item.id)
        )
        if (!track) {
          reportToSentry({
            feature: Feature.TanQuery,
            error: new Error(
              `Missing cache entry for track from ${lineupPrefix} lineup. Missing id: ${item.id}`
            )
          })
          return undefined
        } else {
          return track
        }
      } else {
        const collection = queryClient.getQueryData<TQCollection>(
          getCollectionQueryKey(item.id)
        )
        if (!collection) {
          reportToSentry({
            feature: Feature.TanQuery,
            error: new Error(
              `Missing cache entry for collection from ${lineupPrefix} lineup. Missing id: ${item.id}`
            )
          })
          return undefined
        } else {
          return collection
        }
      }
    })
    .filter(Boolean)
}

/**
 * Helper to provide stitch together tan-query data and easily provide lineup methods as part of our query hooks
 */
export const useLineupQuery = <T>({
  lineupData,
  queryData,
  queryKey,
  lineupActions,
  lineupSelector,
  playbackSource,
  pageSize,
  initialPageSize,
  disableAutomaticCacheHandling = false
}: {
  // Lineup related props
  lineupData: LineupData[]
  queryData: PartialQueryData<T>
  queryKey: QueryKey
  lineupActions: LineupActions
  lineupSelector: Selector<
    CommonState,
    LineupState<LineupTrack | Track | Collection>
  >
  pageSize: number
  initialPageSize?: number
  playbackSource: PlaybackSource
  disableAutomaticCacheHandling?: boolean
}) => {
  const { reportToSentry } = useQueryContext()
  const queryClient = useQueryClient()
  const lineup = useSelector(lineupSelector)

  const isPlaying = useSelector(getPlaying)
  const dispatch = useDispatch()
  // Lineup actions
  const togglePlay = (uid: UID, id: ID) => {
    dispatch(lineupActions.togglePlay(uid, id, playbackSource))
  }

  const play = (uid?: UID) => {
    dispatch(lineupActions.play(uid))
  }

  const pause = () => {
    dispatch(lineupActions.pause())
  }

  const updateLineupOrder = (orderedIds: UID[]) => {
    dispatch(lineupActions.updateLineupOrder(orderedIds))
  }

  const prevQueryKey = usePrevious(queryKey)
  const hasQueryKeyChanged = !isEqual(prevQueryKey, queryKey)

  // Function to handle loading cached data into the lineup
  const loadCachedDataIntoLineup = useCallback(() => {
    // Any time this function is run we reset the lineup.
    // If there's already data in our query cache it will get put back into the lineup below.
    dispatch(lineupActions.reset())
    // NOTE: This squashes all previously cached pages into the first page of the lineup.
    // This means the first page may have more entries than the pageSize.
    // If this causes issues we can slice the data back into pages, but this seems more inefficient.
    if (lineupData?.length) {
      // The TQ cache for lineups only stores data in ID form, but our legacy lineup logic requires full entries.
      // Here we take the ids and retrieve full entities from the tq cache
      // There should never be a cache miss here because if the lineup believes entity is cached, it was primed at some point.
      const fullLineupItems = mapLineupDataToFullLineupItems(
        lineupData,
        queryClient,
        reportToSentry,
        lineup.prefix
      )
      // Put the full entities in the lineup
      dispatch(
        lineupActions.fetchLineupMetadatas(0, lineupData.length, false, {
          items: fullLineupItems
        })
      )
    }
  }, [dispatch, lineupActions, lineupData, queryClient, reportToSentry, lineup])

  // Normally we prime the redux lineup store with the lineupData from the queryFn.
  // However this doesnt work for cache hits, so here we check for cache hits.
  // We know its a cache hit if the queryKey has changed & there is already data present in lineupData
  useEffect(() => {
    // Had to add this disableAutomaticCacheHandling specifically for native mobile track screens since the hooks weren't unmounting
    if (!disableAutomaticCacheHandling && hasQueryKeyChanged) {
      loadCachedDataIntoLineup()
    }
  }, [
    disableAutomaticCacheHandling,
    hasQueryKeyChanged,
    loadCachedDataIntoLineup
  ])

  const status = combineStatuses([
    queryData.isFetching ? Status.LOADING : Status.SUCCESS,
    lineup.status
  ])
  const refresh = useCallback(() => {
    dispatch(lineupActions.reset())
    queryClient.resetQueries({ queryKey })
  }, [dispatch, lineupActions, queryClient, queryKey])

  return {
    status,
    source: playbackSource,
    lineup: {
      ...lineup,
      status,
      isMetadataLoading: status === Status.LOADING,
      hasMore: queryData.isLoading
        ? true
        : 'hasNextPage' in queryData
          ? queryData.hasNextPage
          : false
    },
    refresh,
    togglePlay,
    play,
    pause,
    updateLineupOrder,
    isPlaying,
    initialPageSize,
    pageSize,
    // pass through specific queryData props
    //   this avoids spreading all queryData props which causes extra renders
    loadNextPage: makeLoadNextPage(queryData),
    loadCachedDataIntoLineup,
    data: lineupData,
    isInitialLoading: queryData.isInitialLoading,
    hasNextPage: queryData.hasNextPage,
    isLoading: queryData.isLoading,
    isPending: queryData.isPending,
    isError: queryData.isError,
    isFetching: queryData.isFetching,
    isSuccess: queryData.isSuccess
  }
}

export type UseLineupQueryData = ReturnType<typeof useLineupQuery>
