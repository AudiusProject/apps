import {
  Id,
  EntityType,
  GetUserLibraryTracksSortMethodEnum,
  GetUserLibraryTracksSortDirectionEnum
} from '@audius/sdk'
import {
  InfiniteData,
  useInfiniteQuery,
  useQueryClient
} from '@tanstack/react-query'

import { useQueryContext } from '~/api/tan-query/utils'
import { ID } from '~/models/Identifiers'
import { LibraryCategoryType } from '~/store/pages'
import { removeNullable } from '~/utils'

import { userTrackMetadataFromSDK } from '../../../adapters/track'
import { QUERY_KEYS } from '../queryKeys'
import { QueryKey, QueryOptions, LineupData } from '../types'
import { useCurrentUserId } from '../users/account/useCurrentUserId'
import { makeLoadNextPage } from '../utils/infiniteQueryLoadNextPage'
import { primeTrackData } from '../utils/primeTrackData'

const DEFAULT_PAGE_SIZE = 5

export type UseLibraryTracksArgs = {
  category: LibraryCategoryType
  sortMethod?: GetUserLibraryTracksSortMethodEnum
  sortDirection?: GetUserLibraryTracksSortDirectionEnum
  query?: string
  pageSize?: number
}

export const getLibraryTracksQueryKey = ({
  currentUserId,
  category,
  sortMethod,
  sortDirection,
  query,
  pageSize
}: UseLibraryTracksArgs & { currentUserId: ID | null | undefined }) =>
  [
    QUERY_KEYS.libraryTracks,
    currentUserId,
    {
      category,
      sortMethod,
      sortDirection,
      query,
      pageSize
    }
  ] as unknown as QueryKey<InfiniteData<LineupData[]>>

export const useLibraryTracks = (
  {
    category,
    sortMethod,
    sortDirection,
    query,
    pageSize = DEFAULT_PAGE_SIZE
  }: UseLibraryTracksArgs,
  config?: QueryOptions
) => {
  const { data: currentUserId } = useCurrentUserId()
  const { audiusSdk } = useQueryContext()
  const queryClient = useQueryClient()

  const queryKey = getLibraryTracksQueryKey({
    currentUserId,
    category,
    sortMethod,
    sortDirection,
    query,
    pageSize
  })

  const queryData = useInfiniteQuery({
    queryKey,
    queryFn: async ({ pageParam = 0 }) => {
      if (!currentUserId) return [] as LineupData[]
      const sdk = await audiusSdk()
      const response = await sdk.users.getUserLibraryTracks({
        id: Id.parse(currentUserId),
        offset: pageParam,
        limit: pageSize,
        type: category,
        sortMethod,
        sortDirection,
        query
      })

      const data = response.data ?? []
      const entries = data
        .map((activity) => {
          const track = userTrackMetadataFromSDK(activity.item)
          if (!track) return null
          return { track, timestamp: activity.timestamp }
        })
        .filter(removeNullable)

      primeTrackData({
        tracks: entries.map((e) => e.track),
        queryClient
      })

      return entries.map((e) => ({
        id: e.track.track_id,
        type: EntityType.TRACK,
        timestamp: e.timestamp
      })) as LineupData[]
    },
    getNextPageParam: (lastPage: LineupData[], allPages) => {
      if (lastPage.length < pageSize) return undefined
      return allPages.length * pageSize
    },
    select: (data) => data.pages.flat(),
    initialPageParam: 0,
    staleTime: config?.staleTime ?? Infinity,
    gcTime: Infinity,
    enabled: config?.enabled !== false && !!currentUserId
  })

  const data = queryData.data ?? []
  const trackIds = data
    .filter((d) => d.type === EntityType.TRACK)
    .map((d) => d.id as ID)

  return {
    data,
    trackIds,
    isPending: queryData.isPending,
    isLoading: queryData.isLoading,
    isFetching: queryData.isFetching,
    isFetchingNextPage: queryData.isFetchingNextPage,
    isSuccess: queryData.isSuccess,
    isError: queryData.isError,
    isInitialLoading: queryData.isInitialLoading,
    hasNextPage: queryData.hasNextPage,
    fetchNextPage: queryData.fetchNextPage,
    loadNextPage: makeLoadNextPage(queryData),
    queryKey,
    pageSize
  }
}
