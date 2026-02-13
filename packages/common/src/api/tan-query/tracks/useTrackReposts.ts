import { Id, OptionalId } from '@audius/sdk'
import {
  InfiniteData,
  useInfiniteQuery,
  useQueryClient
} from '@tanstack/react-query'

import { userMetadataListFromSDK } from '~/adapters/user'
import { useQueryContext } from '~/api/tan-query/utils'
import { ID } from '~/models/Identifiers'

import { QUERY_KEYS } from '../queryKeys'
import { QueryKey, QueryOptions } from '../types'
import { useCurrentUserId } from '../users/account/useCurrentUserId'
import { primeUserData } from '../utils/primeUserData'

const DEFAULT_PAGE_SIZE = 20

type UseTrackRepostsArgs = {
  trackId: ID | null | undefined
  pageSize?: number
}

export const getTrackRepostsQueryKey = (args: UseTrackRepostsArgs) => {
  const { trackId, pageSize = DEFAULT_PAGE_SIZE } = args
  return [
    QUERY_KEYS.reposts,
    trackId,
    {
      pageSize
    }
  ] as unknown as QueryKey<InfiniteData<ID[]>>
}

export const useTrackReposts = (
  { trackId, pageSize = DEFAULT_PAGE_SIZE }: UseTrackRepostsArgs,
  options?: QueryOptions
) => {
  const { audiusSdk } = useQueryContext()
  const { data: currentUserId } = useCurrentUserId()
  const queryClient = useQueryClient()

  return useInfiniteQuery({
    queryKey: getTrackRepostsQueryKey({ trackId, pageSize }),
    initialPageParam: 0,
    getNextPageParam: (lastPage: ID[], allPages) => {
      if (lastPage.length < pageSize) return undefined
      return allPages.length * pageSize
    },
    queryFn: async ({ pageParam }) => {
      const sdk = await audiusSdk()
      const { data } = await sdk.full.tracks.getUsersFromReposts({
        trackId: Id.parse(trackId),
        limit: pageSize,
        offset: pageParam,
        userId: OptionalId.parse(currentUserId)
      })
      const users = userMetadataListFromSDK(data)
      primeUserData({ users, queryClient })
      return users.map((user) => user.user_id)
    },
    select: (data) => data.pages.flat(),
    ...options,
    enabled: options?.enabled !== false && !!trackId
  })
}
