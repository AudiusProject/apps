import {
  Id,
  EntityType,
  GetUsersTrackHistorySortMethodEnum,
  GetUsersTrackHistorySortDirectionEnum,
  type TrackActivity
} from '@audius/sdk'
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'

import { trackActivityFromSDK, transformAndCleanList } from '~/adapters'
import { useQueryContext } from '~/api/tan-query/utils'
import { ID } from '~/models'

import { QUERY_KEYS } from '../queryKeys'
import { LineupData, QueryOptions } from '../types'
import { useCurrentUserId } from '../users/account/useCurrentUserId'
import { makeLoadNextPage } from '../utils/infiniteQueryLoadNextPage'
import { primeTrackData } from '../utils/primeTrackData'

const DEFAULT_PAGE_SIZE = 30

type UseTrackHistoryArgs = {
  pageSize?: number
  query?: string
  sortMethod?: GetUsersTrackHistorySortMethodEnum
  sortDirection?: GetUsersTrackHistorySortDirectionEnum
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

      const { data: activityData } = await sdk.users.getUsersTrackHistory({
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
        (activity: TrackActivity) => {
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

      return tracks.map((t) => ({
        id: t.track_id,
        type: EntityType.TRACK
      }))
    },
    select: (data) => data?.pages.flat(),
    ...options,
    enabled: options?.enabled !== false && !!currentUserId
  })

  const queryKey = getTrackHistoryQueryKey(currentUserId, {
    pageSize,
    query,
    sortMethod,
    sortDirection
  })

  const lineupData = queryData.data ?? []
  const trackIds = lineupData
    .filter((d) => d.type === EntityType.TRACK)
    .map((d) => d.id as ID)

  return {
    trackIds,
    queryKey,
    pageSize,
    loadNextPage: makeLoadNextPage(queryData),
    hasNextPage: queryData.hasNextPage,
    isLoading: queryData.isLoading,
    isInitialLoading: queryData.isInitialLoading,
    isPending: queryData.isPending,
    isError: queryData.isError,
    isFetching: queryData.isFetching,
    isSuccess: queryData.isSuccess
  }
}
