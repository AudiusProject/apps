import { Id, full } from '@audius/sdk'
import {
  InfiniteData,
  useInfiniteQuery,
  useQueryClient
} from '@tanstack/react-query'

import { userTrackMetadataFromSDK } from '~/adapters/track'
import { transformAndCleanList } from '~/adapters/utils'
import { primeTrackData, useQueryContext } from '~/api/tan-query/utils'
import { SDKInfiniteQueryArgs } from '~/api/types'
import { ID } from '~/models'

import { QUERY_KEYS } from '../queryKeys'
import { QueryKey, QueryOptions } from '../types'
import { useCurrentUserId } from '../users/account/useCurrentUserId'

const DEFAULT_PAGE_SIZE = 10

// `id` is automatically added by the hook
export type UseRecentlyPlayedTracksArgs = Omit<
  SDKInfiniteQueryArgs<full.GetUsersTrackHistoryRequest>,
  'id'
>
export const getRecentlyPlayedTracksQueryKey = (
  userId: ID | null | undefined,
  args: UseRecentlyPlayedTracksArgs
) => {
  return [QUERY_KEYS.recentlyPlayedTracks, userId, args] as unknown as QueryKey<
    InfiniteData<ID[]>
  >
}

export const useRecentlyPlayedTracks = (
  { pageSize = DEFAULT_PAGE_SIZE, ...args }: UseRecentlyPlayedTracksArgs = {},
  options?: QueryOptions
) => {
  const { audiusSdk } = useQueryContext()
  const { data: currentUserId } = useCurrentUserId()
  const queryClient = useQueryClient()

  return useInfiniteQuery({
    queryKey: getRecentlyPlayedTracksQueryKey(currentUserId, {
      pageSize,
      ...args
    }),
    initialPageParam: 0,
    getNextPageParam: (lastPage: ID[], allPages) => {
      if (lastPage.length < pageSize) return undefined
      return allPages.length * pageSize
    },
    queryFn: async ({ pageParam }) => {
      if (!currentUserId) return []
      const sdk = await audiusSdk()
      const id = Id.parse(currentUserId)
      const { data = [] } = await sdk.full.users.getUsersTrackHistory({
        ...args,
        id,
        userId: id,
        limit: pageSize,
        offset: pageParam
      })
      const tracks = transformAndCleanList(
        data.map((trackActivity) => trackActivity.item),
        userTrackMetadataFromSDK
      )

      primeTrackData({
        tracks,
        queryClient
      })

      return tracks.map((track) => track.track_id)
    },
    select: (data) => data.pages.flat(),
    ...options,
    enabled: options?.enabled !== false && !!currentUserId
  })
}
