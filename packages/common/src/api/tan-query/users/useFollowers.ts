import { Id, OptionalId } from '@audius/sdk/services'
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
import { useUsers } from './useUsers'

const DEFAULT_PAGE_SIZE = 15

type UseFollowersArgs = {
  userId: ID | null | undefined
  pageSize?: number
}

export const getFollowersQueryKey = ({ userId, pageSize }: UseFollowersArgs) =>
  [QUERY_KEYS.followers, userId, { pageSize }] as unknown as QueryKey<
    InfiniteData<ID[]>
  >

/**
 * Hook to fetch followers for a user with infinite query support.
 * This version supports infinite scrolling and maintains the full list of followers.
 */
export const useFollowers = (
  { userId, pageSize = DEFAULT_PAGE_SIZE }: UseFollowersArgs,
  options?: QueryOptions
) => {
  const { audiusSdk } = useQueryContext()
  const { data: currentUserId } = useCurrentUserId()
  const queryClient = useQueryClient()

  const queryRes = useInfiniteQuery({
    queryKey: getFollowersQueryKey({ userId, pageSize }),
    initialPageParam: 0,
    getNextPageParam: (lastPage: ID[], allPages) => {
      if (lastPage.length < pageSize) return undefined
      return allPages.length * pageSize
    },
    queryFn: async ({ pageParam }) => {
      const sdk = await audiusSdk()
      const { data } = await sdk.users.getFollowers({
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

  const { data: users } = useUsers(queryRes.data)

  return {
    users,
    data: queryRes.data,
    isPending: queryRes.isPending,
    isLoading: queryRes.isLoading,
    isSuccess: queryRes.isSuccess,
    hasNextPage: queryRes.hasNextPage,
    isFetchingNextPage: queryRes.isFetchingNextPage,
    fetchNextPage: queryRes.fetchNextPage
  }
}
