import { Id } from '@audius/sdk'
import { useQuery } from '@tanstack/react-query'

import { useQueryContext } from '~/api/tan-query/utils'
import { ID } from '~/models'
import { DeveloperApp } from '~/schemas/developerApps'
import { Nullable } from '~/utils/typeUtils'

import { QUERY_KEYS } from '../queryKeys'
import { QueryKey, SelectableQueryOptions } from '../types'

export const getDeveloperAppsQueryKey = (userId: Nullable<ID> | undefined) => {
  return [QUERY_KEYS.developerApps, userId] as unknown as QueryKey<
    DeveloperApp[]
  >
}

export const useDeveloperApps = <TResult = DeveloperApp[]>(
  userId: Nullable<ID> | undefined,
  options?: SelectableQueryOptions<DeveloperApp[], TResult>
) => {
  const { audiusSdk } = useQueryContext()

  return useQuery({
    queryKey: getDeveloperAppsQueryKey(userId),
    queryFn: async () => {
      const sdk = await audiusSdk()
      const { data = [] } = await sdk.users.getDeveloperApps({
        id: Id.parse(userId)
      })

      return data.map(
        ({ address, name, description, imageUrl }): DeveloperApp => ({
          name,
          description,
          imageUrl,
          apiKey: address.slice(2)
        })
      )
    },
    ...options,
    enabled: options?.enabled !== false && !!userId
  })
}
