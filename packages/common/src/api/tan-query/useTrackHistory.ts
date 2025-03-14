import { Id, full } from '@audius/sdk'
import {
  QueryKey,
  useInfiniteQuery,
  useQueryClient
} from '@tanstack/react-query'
import { useDispatch } from 'react-redux'

import { trackActivityFromSDK, transformAndCleanList } from '~/adapters'
import { useAudiusQueryContext } from '~/audius-query'
import { UserTrackMetadata } from '~/models'
import { PlaybackSource } from '~/models/Analytics'
import {
  historyPageTracksLineupActions,
  historyPageSelectors
} from '~/store/pages'

import { QUERY_KEYS } from './queryKeys'
import { QueryOptions } from './types'
import { useCurrentUserId } from './useCurrentUserId'
import { primeTrackData } from './utils/primeTrackData'
import { useLineupQuery } from './utils/useLineupQuery'

const DEFAULT_PAGE_SIZE = 30

type UseTrackHistoryArgs = {
  pageSize?: number
  query?: string
  sortMethod?: full.GetUsersTrackHistorySortMethodEnum
  sortDirection?: full.GetUsersTrackHistorySortDirectionEnum
}

export const getTrackHistoryQueryKey = ({
  query,
  pageSize,
  sortMethod,
  sortDirection
}: UseTrackHistoryArgs) => [
  QUERY_KEYS.trackHistory,
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
  const { audiusSdk } = useAudiusQueryContext()
  const { data: currentUserId } = useCurrentUserId()
  const queryClient = useQueryClient()
  const dispatch = useDispatch()

  const queryData = useInfiniteQuery<
    UserTrackMetadata[],
    Error,
    UserTrackMetadata[],
    QueryKey,
    number
  >({
    initialPageParam: 0,
    getNextPageParam: (lastPage: UserTrackMetadata[], allPages) => {
      if (lastPage.length < pageSize) return undefined
      return allPages.length * pageSize
    },
    queryKey: getTrackHistoryQueryKey({
      pageSize,
      query,
      sortMethod,
      sortDirection
    }),
    queryFn: async ({ pageParam }) => {
      const sdk = await audiusSdk()
      if (!currentUserId) return []

      const { data: activityData } = await sdk.full.users.getUsersTrackHistory({
        id: Id.parse(currentUserId),
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
      primeTrackData({ tracks, queryClient, dispatch })

      // Update lineup when new data arrives
      // TODO: can this inside useLineupQuery?
      dispatch(
        historyPageTracksLineupActions.fetchLineupMetadatas(
          pageParam,
          pageSize,
          false,
          { tracks }
        )
      )

      return tracks
    },
    select: (data) => data.pages.flat(),
    ...options,
    enabled: options?.enabled !== false && !!currentUserId
  })

  const lineupData = useLineupQuery({
    queryData,
    queryKey: getTrackHistoryQueryKey({
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

  return {
    ...queryData,
    ...lineupData,
    pageSize
  }
}
