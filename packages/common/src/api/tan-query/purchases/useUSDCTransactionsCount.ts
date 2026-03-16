import {
  Id,
  type GetUSDCTransactionsMethodEnum,
  type GetUSDCTransactionsTypeEnum
} from '@audius/sdk/services'
import { useQuery } from '@tanstack/react-query'

import { useQueryContext } from '~/api/tan-query/utils'
import { ID } from '~/models/Identifiers'

import { QUERY_KEYS } from '../queryKeys'
import { QueryOptions } from '../types'
import { useCurrentUserId } from '../users/account/useCurrentUserId'

type UseUSDCTransactionsCountArgs = {
  type?: GetUSDCTransactionsTypeEnum[]
  method?: GetUSDCTransactionsMethodEnum
}

export const getUSDCTransactionsCountQueryKey = (
  currentUserId: ID | null | undefined,
  args?: UseUSDCTransactionsCountArgs
) => [
  QUERY_KEYS.usdcTransactionsCount,
  currentUserId,
  {
    type: args?.type,
    method: args?.method
  }
]

export const useUSDCTransactionsCount = (
  args?: UseUSDCTransactionsCountArgs,
  options?: QueryOptions
) => {
  const { audiusSdk } = useQueryContext()
  const { data: currentUserId } = useCurrentUserId()

  return useQuery({
    queryKey: getUSDCTransactionsCountQueryKey(currentUserId, args),
    queryFn: async () => {
      if (!currentUserId) return 0
      const sdk = await audiusSdk()
      const { data } = await sdk.users.getUSDCTransactionCount({
        id: Id.parse(currentUserId),
        type: args?.type,
        method: args?.method
      })
      return data ?? 0
    },
    ...options,
    enabled: options?.enabled !== false && !!currentUserId
  })
}
