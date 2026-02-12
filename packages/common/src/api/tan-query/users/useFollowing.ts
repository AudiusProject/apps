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
import { primeUserData } from '../utils/primeUserData'

import { useCurrentUserId } from './account/useCurrentUserId'

const DEFAULT_PAGE_SIZE = 20

type UseFollowingArgs = {
  userId: ID | null | undefined
  pageSize?: number
}

export const getFollowingQueryKey = ({ userId, pageSize }: UseFollowingArgs) =>
  [QUERY_KEYS.following, userId, { pageSize }] as unknown as QueryKey<
    InfiniteData<ID[]>
  >

/**
 * Hook to fetch following for a user with infinite query support.
 * This version supports infinite scrolling and maintains the full list of following.
 */
export const useFollowing = (
  { userId, pageSize = DEFAULT_PAGE_SIZE }: UseFollowingArgs,
  options?: QueryOptions
) => {
  const { audiusSdk } = useQueryContext()
  const { data: currentUserId } = useCurrentUserId()
  const queryClient = useQueryClient()

  return useInfiniteQuery({
    queryKey: getFollowingQueryKey({ userId, pageSize }),
    initialPageParam: 0,
    getNextPageParam: (lastPage: ID[], allPages) => {
      if (lastPage.length < pageSize) return undefined
      return allPages.length * pageSize
    },
    queryFn: async ({ pageParam }) => {
      const sdk = await audiusSdk()
      const { data = [] } = await sdk.users.getFollowing({
        id: Id.parse(userId),
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
    enabled: options?.enabled !== false && !!userId
  })
}
