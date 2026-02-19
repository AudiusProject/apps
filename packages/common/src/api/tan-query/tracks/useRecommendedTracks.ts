import { Id, type GetUserRecommendedTracksRequest } from '@audius/sdk'
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
export type UseRecommendedTracksArgs = Omit<
  SDKInfiniteQueryArgs<GetUserRecommendedTracksRequest>,
  'id'
>

export const getRecommendedTracksQueryKey = (
  userId: ID | null | undefined,
  args: UseRecommendedTracksArgs
) => {
  return [QUERY_KEYS.recommendedTracks, userId, args] as unknown as QueryKey<
    InfiniteData<ID[]>
  >
}

export const useRecommendedTracks = (
  { pageSize = DEFAULT_PAGE_SIZE, ...args }: UseRecommendedTracksArgs = {},
  options?: QueryOptions
) => {
  const { audiusSdk } = useQueryContext()
  const { data: currentUserId } = useCurrentUserId()
  const queryClient = useQueryClient()

  return useInfiniteQuery({
    queryKey: getRecommendedTracksQueryKey(currentUserId, {
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
      const { data = [] } = await sdk.users.getUserRecommendedTracks({
        ...args,
        id: Id.parse(currentUserId),
        userId: Id.parse(currentUserId),
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
    enabled: options?.enabled !== false && !!currentUserId
  })
}
