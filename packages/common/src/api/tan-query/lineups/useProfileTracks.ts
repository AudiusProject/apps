import { EntityType, OptionalId } from '@audius/sdk'
import {
  InfiniteData,
  useInfiniteQuery,
  useQueryClient
} from '@tanstack/react-query'

import { transformAndCleanList, userTrackMetadataFromSDK } from '~/adapters'
import { useQueryContext } from '~/api/tan-query/utils'
import { ID } from '~/models/Identifiers'
import { TracksSortMode } from '~/store/pages/profile/types'

import { QUERY_KEYS } from '../queryKeys'
import { QueryKey, LineupData, QueryOptions } from '../types'
import { useCurrentUserId } from '../users/account/useCurrentUserId'
import { makeLoadNextPage } from '../utils/infiniteQueryLoadNextPage'
import { primeTrackData } from '../utils/primeTrackData'

const DEFAULT_PAGE_SIZE = 10

type UseProfileTracksArgs = {
  handle: string
  pageSize?: number
  sort?: TracksSortMode
  getUnlisted?: boolean
}

export const getProfileTracksQueryKey = ({
  handle,
  pageSize,
  sort,
  getUnlisted
}: UseProfileTracksArgs) =>
  [
    QUERY_KEYS.profileTracks,
    handle,
    { pageSize, sort, getUnlisted }
  ] as unknown as QueryKey<InfiniteData<LineupData[]>>

export const useProfileTracks = (
  {
    handle,
    pageSize = DEFAULT_PAGE_SIZE,
    sort = TracksSortMode.RECENT,
    getUnlisted = true
  }: UseProfileTracksArgs,
  options?: QueryOptions
) => {
  const { audiusSdk } = useQueryContext()
  const { data: currentUserId } = useCurrentUserId()
  const queryClient = useQueryClient()

  const queryKey = getProfileTracksQueryKey({
    handle,
    pageSize,
    sort,
    getUnlisted
  })

  const query = useInfiniteQuery({
    queryKey,
    initialPageParam: 0,
    getNextPageParam: (lastPage: LineupData[], allPages) => {
      if (lastPage.length < pageSize) return undefined
      return allPages.length * pageSize
    },
    queryFn: async ({ pageParam }) => {
      const sdk = await audiusSdk()
      if (!handle) return []
      // If the @ is still at the beginning of the handle, trim it off
      const handleNoAt = handle.startsWith('@') ? handle.substring(1) : handle
      const { data: tracks } = await sdk.users.getTracksByUserHandle({
        handle: handleNoAt,
        userId: OptionalId.parse(currentUserId),
        limit: pageSize,
        offset: pageParam,
        sort: sort === TracksSortMode.POPULAR ? 'plays' : 'date',
        filterTracks: getUnlisted ? 'all' : 'public'
      })

      if (!tracks) return []

      const processedTracks = transformAndCleanList(
        tracks,
        userTrackMetadataFromSDK
      )
      primeTrackData({ tracks: processedTracks, queryClient })

      return processedTracks.map((t) => ({
        id: t.track_id,
        type: EntityType.TRACK
      }))
    },
    select: (data) => data?.pages.flat(),
    ...options,
    enabled: options?.enabled !== false && !!handle
  })

  const data = query.data ?? []
  const trackIds = data
    .filter((d) => d.type === EntityType.TRACK)
    .map((d) => d.id as ID)

  return {
    data,
    trackIds,
    isPending: query.isPending,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isSuccess: query.isSuccess,
    isError: query.isError,
    isInitialLoading: query.isInitialLoading,
    hasNextPage: query.hasNextPage,
    fetchNextPage: query.fetchNextPage,
    loadNextPage: makeLoadNextPage(query),
    refetch: query.refetch,
    queryKey
  }
}
