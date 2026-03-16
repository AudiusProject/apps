import { Id } from '@audius/sdk/services'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { pick } from 'lodash'

import { userMetadataListFromSDK } from '~/adapters/user'
import { useQueryContext } from '~/api/tan-query/utils'
import { ID } from '~/models/Identifiers'
import { UserMetadata } from '~/models/User'

import { QUERY_KEYS } from '../queryKeys'
import { QueryKey, QueryOptions, SelectableQueryOptions } from '../types'
import { primeUserData } from '../utils/primeUserData'

import { useCurrentUserId } from './account/useCurrentUserId'
import { useUsers } from './useUsers'

export const getMutedUsersQueryKey = (currentUserId: ID | null | undefined) => {
  return [QUERY_KEYS.mutedUsers, currentUserId] as unknown as QueryKey<ID[]>
}

export const useMutedUsers = <TResult = UserMetadata[]>(
  options?: SelectableQueryOptions<UserMetadata[], TResult>
) => {
  const { audiusSdk } = useQueryContext()
  const { data: currentUserId } = useCurrentUserId()
  const queryClient = useQueryClient()

  const simpleOptions = pick(options, [
    'enabled',
    'staleTime',
    'placeholderData'
  ]) as QueryOptions

  const { data: userIds } = useQuery({
    queryKey: getMutedUsersQueryKey(currentUserId),
    queryFn: async () => {
      if (!currentUserId) return []
      const sdk = await audiusSdk()
      const { data } = await sdk.users.getMutedUsers({
        id: Id.parse(currentUserId)
      })
      const users = userMetadataListFromSDK(data)
      primeUserData({ users, queryClient })
      return users.map((user) => user.user_id)
    },
    ...simpleOptions,
    enabled: simpleOptions?.enabled !== false && !!currentUserId
  })

  return useUsers(userIds, options)
}
