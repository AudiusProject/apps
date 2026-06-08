import { EntityType, OptionalId } from '@audius/sdk'
import {
  InfiniteData,
  useInfiniteQuery,
  useQueryClient
} from '@tanstack/react-query'

import { repostActivityFromSDK, transformAndCleanList } from '~/adapters'
import { useQueryContext, primeUserData } from '~/api/tan-query/utils'
import { UserTrackMetadata, UserCollectionMetadata, ID } from '~/models'

import { QUERY_KEYS } from '../queryKeys'
import { QueryKey, LineupData, QueryOptions } from '../types'
import { useCurrentUserId } from '../users/account/useCurrentUserId'
import { makeLoadNextPage } from '../utils/infiniteQueryLoadNextPage'
import { primeCollectionData } from '../utils/primeCollectionData'
import { primeTrackData } from '../utils/primeTrackData'

const DEFAULT_PAGE_SIZE = 10

type UseProfileRepostsArgs = {
  handle: string
  pageSize?: number
}

export const getProfileRepostsQueryKey = ({
  handle,
  pageSize
}: UseProfileRepostsArgs) =>
  [QUERY_KEYS.profileReposts, handle, { pageSize }] as unknown as QueryKey<
    InfiniteData<(UserTrackMetadata | UserCollectionMetadata)[]>
  >

export const useProfileReposts = (
  { handle, pageSize = DEFAULT_PAGE_SIZE }: UseProfileRepostsArgs,
  options?: QueryOptions
) => {
  const { audiusSdk } = useQueryContext()
  const { data: currentUserId } = useCurrentUserId()
  const queryClient = useQueryClient()

  const queryKey = getProfileRepostsQueryKey({ handle, pageSize })

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
      const { data: repostsSDKData } = await sdk.users.getRepostsByHandle({
        handle: handleNoAt,
        userId: OptionalId.parse(currentUserId),
        limit: pageSize,
        offset: pageParam
      })

      if (!repostsSDKData) return []

      // Transform the reposts data and get just the items
      const reposts = transformAndCleanList(
        repostsSDKData,
        (activity) => repostActivityFromSDK(activity)?.item
      )

      primeUserData({
        users: reposts
          .filter((item): item is UserTrackMetadata => 'track_id' in item)
          .map((item) => item.user),
        queryClient
      })
      primeTrackData({
        tracks: reposts.filter(
          (item): item is UserTrackMetadata => 'track_id' in item
        ),
        queryClient
      })
      primeCollectionData({
        collections: reposts.filter(
          (item): item is UserCollectionMetadata => 'playlist_id' in item
        ),
        queryClient
      })

      // Return only ids
      return reposts.map((t) =>
        'track_id' in t
          ? { id: t.track_id, type: EntityType.TRACK }
          : { id: t.playlist_id, type: EntityType.PLAYLIST }
      )
    },
    select: (data) => {
      return data?.pages?.flat()
    },
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
