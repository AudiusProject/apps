import { Id } from '@audius/sdk'
import { useQuery } from '@tanstack/react-query'

import { managedUserListFromSDK } from '~/adapters/user'
import { useQueryContext } from '~/api/tan-query/utils'
import { ID } from '~/models/Identifiers'
import { ManagedUserMetadata } from '~/models/User'

import { QUERY_KEYS } from '../../queryKeys'
import { QueryKey, SelectableQueryOptions } from '../../types'
import { isValidId } from '../../utils/isValidId'

export const getManagedAccountsQueryKey = (userId: ID | null | undefined) =>
  [
    QUERY_KEYS.account,
    QUERY_KEYS.managedAccounts,
    userId
  ] as unknown as QueryKey<ManagedUserMetadata[]>

export const useManagedAccounts = <TResult = ManagedUserMetadata[] | undefined>(
  userId?: ID | null,
  options?: SelectableQueryOptions<TResult>
) => {
  const { audiusSdk } = useQueryContext()
  return useQuery({
    queryKey: getManagedAccountsQueryKey(userId),
    queryFn: async () => {
      const sdk = await audiusSdk()
      const managedUsers = await sdk.users.getManagedUsers({
        id: Id.parse(userId)
      })
      const { data = [] } = managedUsers
      return managedUserListFromSDK(data) as TResult
    },
    enabled: isValidId(userId),
    ...options
  })
}
