import { Id, full, EntityType } from '@audius/sdk'
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { useDispatch } from 'react-redux'

import { trackActivityFromSDK, transformAndCleanList } from '~/adapters'
import { useQueryContext } from '~/api/tan-query/utils'
import { ID } from '~/models'
import { PlaybackSource } from '~/models/Analytics'
import {
  historyPageTracksLineupActions,
  historyPageSelectors
} from '~/store/pages'

import { useLineupQuery } from '../lineups/useLineupQuery'
import { QUERY_KEYS } from '../queryKeys'
import { LineupData, QueryOptions } from '../types'
import { useCurrentUserId } from '../users/account/useCurrentUserId'
import { primeTrackData } from '../utils/primeTrackData'

const DEFAULT_PAGE_SIZE = 30

type UseTrackHistoryArgs = {
  pageSize?: number
  query?: string
  sortMethod?: full.GetUsersTrackHistorySortMethodEnum
  sortDirection?: full.GetUsersTrackHistorySortDirectionEnum
}

export const getTrackHistoryQueryKey = (
  currentUserId: ID | null | undefined,
  { query, pageSize, sortMethod, sortDirection }: UseTrackHistoryArgs
) => [
  QUERY_KEYS.trackHistory,
  currentUserId,
  { pageSize, query, sortMethod, sortDirection }
]

export const useTrackHistory = (
  {
    pageSize = DEFAULT_PAGE_SIZE,
    query,
    sortMethod,
    sortDirection
  }: UseTrackHistoryArgs = {},
  options?: QueryOptions
) => {
  const { audiusSdk } = useQueryContext()
  const { data: currentUserId } = useCurrentUserId()
  const queryClient = useQueryClient()
  const dispatch = useDispatch()

  const queryData = useInfiniteQuery({
    initialPageParam: 0,
    getNextPageParam: (lastPage: LineupData[], allPages) => {
      if (lastPage.length < pageSize) return undefined
      return allPages.length * pageSize
    },
    queryKey: getTrackHistoryQueryKey(currentUserId, {
      pageSize,
      query,
      sortMethod,
      sortDirection
    }),
    queryFn: async ({ pageParam }) => {
      const sdk = await audiusSdk()
      if (!currentUserId) return []

      const id = Id.parse(currentUserId)

      const { data: activityData } = await sdk.full.users.getUsersTrackHistory({
        id,
        userId: id,
        limit: pageSize,
        offset: pageParam,
        query,
        sortMethod,
        sortDirection
      })

      if (!activityData) return []

      const tracks = transformAndCleanList(
        activityData,
        (activity: full.ActivityFull) => {
          const track = trackActivityFromSDK(activity)?.item
          if (track) {
            return {
              ...track,
              dateListened: activity.timestamp
            }
          }
          return track
        }
      )
      primeTrackData({ tracks, queryClient })

      // Update lineup when new data arrives
      // TODO: can this inside useLineupQuery?
      dispatch(
        historyPageTracksLineupActions.fetchLineupMetadatas(
          pageParam,
          pageSize,
          false,
          { items: tracks }
        )
      )

      return tracks.map((t) => ({
        id: t.track_id,
        type: EntityType.TRACK
      }))
    },
    select: (data) => data?.pages.flat(),
    ...options,
    enabled: options?.enabled !== false && !!currentUserId
  })

  return useLineupQuery({
    lineupData: queryData.data ?? [],
    queryData,
    queryKey: getTrackHistoryQueryKey(currentUserId, {
      pageSize,
      query,
      sortMethod,
      sortDirection
    }),
    lineupActions: historyPageTracksLineupActions,
    lineupSelector: historyPageSelectors.getHistoryTracksLineup,
    playbackSource: PlaybackSource.HISTORY_PAGE,
    pageSize
  })
}
