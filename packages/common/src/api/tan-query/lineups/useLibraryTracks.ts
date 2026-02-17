import { Id, EntityType } from '@audius/sdk'
import {
  GetUserLibraryTracksSortMethodEnum,
  GetUserLibraryTracksSortDirectionEnum
} from '@audius/sdk/src/sdk/api/generated/full/apis/UsersApi'
import {
  InfiniteData,
  useInfiniteQuery,
  useQueryClient
} from '@tanstack/react-query'
import { useDispatch } from 'react-redux'

import { useQueryContext } from '~/api/tan-query/utils'
import { PlaybackSource } from '~/models/Analytics'
import { ID } from '~/models/Identifiers'
import {
  libraryPageTracksLineupActions,
  libraryPageSelectors,
  LibraryCategoryType
} from '~/store/pages'
import { removeNullable } from '~/utils'

import { userTrackMetadataFromSDK } from '../../../adapters/track'
import { QUERY_KEYS } from '../queryKeys'
import { QueryKey, QueryOptions, LineupData } from '../types'
import { useCurrentUserId } from '../users/account/useCurrentUserId'
import { makeLoadNextPage } from '../utils/infiniteQueryLoadNextPage'
import { primeTrackData } from '../utils/primeTrackData'

import { useLineupQuery } from './useLineupQuery'

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
  const dispatch = useDispatch()

  const queryData = useInfiniteQuery({
    queryKey: getLibraryTracksQueryKey({
      currentUserId,
      category,
      sortMethod,
      sortDirection,
      query,
      pageSize
    }),
    queryFn: async ({ pageParam = 0 }) => {
      if (!currentUserId) return []
      const sdk = await audiusSdk()
      const { data = [] } = await sdk.users.getUserLibraryTracks({
        id: Id.parse(currentUserId),
        offset: pageParam,
        limit: pageSize,
        type: category,
        sortMethod,
        sortDirection,
        query
      })

      const tracks = data
        .map((activity) => userTrackMetadataFromSDK(activity.item))
        .filter(removeNullable)

      primeTrackData({ tracks, queryClient })

      // Update lineup when new data arrives
      dispatch(
        libraryPageTracksLineupActions.fetchLineupMetadatas(
          pageParam,
          pageSize,
          false,
          { tracks }
        )
      )

      return tracks.map((t) => ({
        id: t.track_id,
        type: EntityType.TRACK
      }))
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

  const lineupData = useLineupQuery({
    lineupData: queryData.data ?? [],
    queryData,
    queryKey: getLibraryTracksQueryKey({
      currentUserId,
      category,
      sortMethod,
      sortDirection,
      query,
      pageSize
    }),
    lineupActions: libraryPageTracksLineupActions,
    lineupSelector: libraryPageSelectors.getLibraryTracksLineup,
    playbackSource: PlaybackSource.TRACK_TILE,
    pageSize
  })

  return {
    ...lineupData,
    loadNextPage: makeLoadNextPage(queryData),
    pageSize
  }
}
