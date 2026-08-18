import { Id, OptionalId } from '@audius/sdk'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import { userMetadataListFromSDK } from '~/adapters/user'
import { useQueryContext } from '~/api/tan-query/utils'
import { ID } from '~/models/Identifiers'

import { QUERY_KEYS } from '../queryKeys'
import { QueryKey, QueryOptions } from '../types'
import { primeUserData } from '../utils/primeUserData'

import { useCurrentUserId } from './account/useCurrentUserId'
import { useUsers } from './useUsers'

const DEFAULT_LIMIT = 10

export type UseSuggestedFollowsArgs = {
  limit?: number
}

export const getSuggestedFollowsQueryKey = ({
  userId,
  limit = DEFAULT_LIMIT
}: UseSuggestedFollowsArgs & { userId: ID | null | undefined }) =>
  [QUERY_KEYS.suggestedFollows, userId, { limit }] as unknown as QueryKey<ID[]>

/**
 * Artists to suggest the current user follow, derived from the tracks and
 * albums they have favorited or reposted but whose artist they don't already
 * follow.
 *
 * Returns an empty array for users with no favorites or reposts — see
 * `useFollowSuggestions` for the surface-level fallback to featured artists.
 */
export const useSuggestedFollows = (
  { limit = DEFAULT_LIMIT }: UseSuggestedFollowsArgs = {},
  options?: QueryOptions
) => {
  const { audiusSdk } = useQueryContext()
  const { data: currentUserId } = useCurrentUserId()
  const queryClient = useQueryClient()

  return useQuery({
    queryKey: getSuggestedFollowsQueryKey({ userId: currentUserId, limit }),
    queryFn: async () => {
      const sdk = await audiusSdk()
      const { data = [] } = await sdk.users.getSuggestedFollows({
        id: Id.parse(currentUserId),
        limit,
        userId: OptionalId.parse(currentUserId)
      })
      const users = userMetadataListFromSDK(data)
      primeUserData({ users, queryClient })
      return users.map((user) => user.user_id)
    },
    ...options,
    enabled: options?.enabled !== false && !!currentUserId
  })
}

export const useSuggestedFollowsUsers = (
  args: UseSuggestedFollowsArgs = {},
  options?: QueryOptions
) => {
  const { data: userIds, isPending } = useSuggestedFollows(args, options)
  const { data: users } = useUsers(userIds)
  return { data: users, isPending }
}
