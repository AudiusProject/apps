import { Id } from '@audius/sdk'
import { useQuery } from '@tanstack/react-query'

import { useQueryContext } from '~/api/tan-query/utils'
import { ID } from '~/models'

import { QUERY_KEYS } from '../queryKeys'
import { QueryKey, QueryOptions } from '../types'

export const getSalesCountQueryKey = (userId: ID | null | undefined) => {
  return [QUERY_KEYS.salesCount, userId] as unknown as QueryKey<number>
}

export const useSalesCount = (
  userId: ID | null | undefined,
  options?: QueryOptions
) => {
  const context = useQueryContext()
  const audiusSdk = context.audiusSdk

  return useQuery({
    queryKey: getSalesCountQueryKey(userId),
    queryFn: async () => {
      const sdk = await audiusSdk()
      const { data = 0 } = await sdk.users.getSalesCount({
        id: Id.parse(userId),
        userId: Id.parse(userId)
      })
      return data
    },
    ...options,
    enabled: options?.enabled !== false && !!audiusSdk && !!userId
  })
}
