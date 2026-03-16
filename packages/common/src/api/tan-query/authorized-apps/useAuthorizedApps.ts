import { AuthorizedApp, Id } from '@audius/sdk/services'
import { useQuery } from '@tanstack/react-query'

import { useQueryContext } from '~/api/tan-query/utils'
import { ID } from '~/models'
import { Nullable } from '~/utils/typeUtils'

import { QUERY_KEYS } from '../queryKeys'
import { QueryKey, SelectableQueryOptions } from '../types'
import { useCurrentUserId } from '../users/account/useCurrentUserId'

export const getAuthorizedAppsQueryKey = (userId: Nullable<ID> | undefined) => {
  return [QUERY_KEYS.authorizedApps, userId] as unknown as QueryKey<
    AuthorizedApp[]
  >
}

export const useAuthorizedApps = <TResult = AuthorizedApp[]>(
  options?: SelectableQueryOptions<AuthorizedApp[], TResult>
) => {
  const { audiusSdk } = useQueryContext()
  const { data: userId } = useCurrentUserId()

  return useQuery({
    queryKey: getAuthorizedAppsQueryKey(userId),
    queryFn: async () => {
      const sdk = await audiusSdk()
      const { data = [] } = await sdk.users.getAuthorizedApps({
        id: Id.parse(userId)
      })

      return data
    },
    ...options,
    enabled: options?.enabled !== false && !!userId
  })
}
