import { Id } from '@audius/sdk'
import { useQuery } from '@tanstack/react-query'

import { userManagerListFromSDK } from '~/adapters/user'
import { useQueryContext } from '~/api/tan-query/utils'
import { ID } from '~/models/Identifiers'
import { UserManagerMetadata } from '~/models/User'

import { QUERY_KEYS } from '../../queryKeys'
import { QueryKey, SelectableQueryOptions } from '../../types'
import { isValidId } from '../../utils/isValidId'

export const getManagersQueryKey = (userId: ID | null | undefined) =>
  [QUERY_KEYS.account, QUERY_KEYS.userManagers, userId] as unknown as QueryKey<
    UserManagerMetadata[]
  >

export const useManagers = <TResult = UserManagerMetadata[] | undefined>(
  userId?: ID | null,
  options?: SelectableQueryOptions<TResult>
) => {
  const { audiusSdk } = useQueryContext()
  return useQuery({
    queryKey: getManagersQueryKey(userId),
    queryFn: async () => {
      const sdk = await audiusSdk()
      const managers = await sdk.users.getManagers({
        id: Id.parse(userId)
      })
      const { data: rawData = [] } = managers
      // Only include approved or pending (not explicitly false)
      const data = rawData.filter((g: any) => g.grant.isApproved !== false)
      return userManagerListFromSDK(data) as TResult
    },
    enabled: isValidId(userId),
    ...options
  })
}
