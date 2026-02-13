import { full, OptionalId } from '@audius/sdk'
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

export type UseRecentlyCommentedTracksArgs =
  SDKInfiniteQueryArgs<full.GetTracksWithRecentCommentsRequest>

export const getRecentlyCommentedTracksQueryKey = (
  userId: ID | null | undefined,
  args: UseRecentlyCommentedTracksArgs
) => {
  return [
    QUERY_KEYS.recentlyCommentedTracks,
    userId,
    args
  ] as unknown as QueryKey<InfiniteData<ID[]>>
}

export const useRecentlyCommentedTracks = (
  {
    pageSize = DEFAULT_PAGE_SIZE,
    ...args
  }: UseRecentlyCommentedTracksArgs = {},
  options?: QueryOptions
) => {
  const { audiusSdk } = useQueryContext()
  const { data: currentUserId } = useCurrentUserId()
  const queryClient = useQueryClient()

  return useInfiniteQuery({
    queryKey: getRecentlyCommentedTracksQueryKey(currentUserId, {
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
      const { data = [] } = await sdk.full.tracks.getTracksWithRecentComments({
        ...args,
        userId: OptionalId.parse(currentUserId),
        limit: pageSize,
        offset: pageParam
      })

      const tracks = primeTrackData({
        tracks: transformAndCleanList(data, userTrackMetadataFromSDK),
        queryClient
      })

      return tracks.map(({ track_id }) => track_id)
    },
    select: (data) => data.pages.flat(),
    ...options,
    enabled: options?.enabled !== false
  })
}
