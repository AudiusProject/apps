import { Id, SalesAggregate } from '@audius/sdk/services'
import { useQuery } from '@tanstack/react-query'

import { useQueryContext } from '~/api/tan-query/utils'
import { ID } from '~/models'

import { QUERY_KEYS } from '../queryKeys'
import { QueryKey, SelectableQueryOptions } from '../types'
import { useCurrentUserId } from '../users/account/useCurrentUserId'

export type SalesAggregateWithIntIds = Omit<SalesAggregate, 'contentId'> & {
  contentId: number
}

export const getSalesAggregateQueryKey = (userId: ID | null | undefined) => {
  return [QUERY_KEYS.salesAggregate, userId] as unknown as QueryKey<
    SalesAggregateWithIntIds[] | null
  >
}

export const useSalesAggregate = <
  TResult = SalesAggregateWithIntIds[] | null | undefined
>(
  options?: SelectableQueryOptions<
    SalesAggregateWithIntIds[] | null | undefined,
    TResult
  >
) => {
  const { audiusSdk } = useQueryContext()
  const { data: currentUserId } = useCurrentUserId()

  return useQuery({
    queryKey: getSalesAggregateQueryKey(currentUserId),
    queryFn: async () => {
      if (!currentUserId) return null
      const sdk = await audiusSdk()
      const { data } = await sdk.users.getSalesAggregate({
        id: Id.parse(currentUserId)
      })
      return data?.map((sale) => ({
        ...sale,
        contentId: parseInt(sale.contentId)
      }))
    },
    ...options,
    enabled: options?.enabled !== false && !!currentUserId
  })
}
