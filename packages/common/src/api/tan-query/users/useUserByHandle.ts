import { AudiusSdk, OptionalId } from '@audius/sdk'
import { QueryClient, useQuery, useQueryClient } from '@tanstack/react-query'
import { omit } from 'lodash'

import { userMetadataListFromSDK } from '~/adapters/user'
import { useQueryContext } from '~/api/tan-query/utils'
import { ID } from '~/models/Identifiers'
import { User } from '~/models/User'

import { QUERY_KEYS } from '../queryKeys'
import { QueryKey, QueryOptions, SelectableQueryOptions } from '../types'
import { entityCacheOptions } from '../utils/entityCacheOptions'
import { primeUserData } from '../utils/primeUserData'

import { useCurrentUserId } from './account/useCurrentUserId'
import { useUser } from './useUser'

export const getUserByHandleQueryKey = (handle: string | null | undefined) => {
  return [
    QUERY_KEYS.userByHandle,
    handle?.replace('/', '')?.toLowerCase()
  ] as unknown as QueryKey<ID>
}

export const getUserByHandleQueryFn = async (
  handle: string | null | undefined,
  sdk: AudiusSdk,
  queryClient: QueryClient,
  currentUserId?: ID | null
) => {
  if (!handle) return undefined
  const { data } = await sdk.full.users.getUserByHandle({
    handle: handle.toLowerCase(),
    userId: OptionalId.parse(currentUserId)
  })
  const user = userMetadataListFromSDK(data)[0]

  primeUserData({ users: [user], queryClient })
  return user.user_id
}

export const useUserByHandle = <TResult = User>(
  handle: string | null | undefined,
  options?: SelectableQueryOptions<User, TResult>
) => {
  const { audiusSdk } = useQueryContext()
  const { data: currentUserId } = useCurrentUserId()
  const queryClient = useQueryClient()

  const { data: userId } = useQuery({
    queryKey: getUserByHandleQueryKey(handle),
    queryFn: async () =>
      getUserByHandleQueryFn(
        handle,
        await audiusSdk(),
        queryClient,
        currentUserId
      ),
    ...(omit(options, 'select') as QueryOptions),
    ...entityCacheOptions,
    enabled: options?.enabled !== false && !!handle
  })

  return useUser(userId, {
    select: options?.select
  })
}
