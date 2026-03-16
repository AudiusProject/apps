import { Id } from '@audius/sdk/services'
import { useQuery } from '@tanstack/react-query'

import { useQueryContext } from '~/api/tan-query/utils'
import { ID } from '~/models'
import { Nullable } from '~/utils/typeUtils'

import { QUERY_KEYS } from '../queryKeys'
import { QueryKey, SelectableQueryOptions } from '../types'
import { useCurrentUserId } from '../users/account/useCurrentUserId'

export const getAudioTransactionsCountQueryKey = (
  userId: Nullable<ID> | undefined
) => {
  return [
    QUERY_KEYS.audioTransactionsCount,
    userId
  ] as unknown as QueryKey<number>
}

export const useAudioTransactionsCount = <TResult = number>(
  options?: SelectableQueryOptions<number, TResult>
) => {
  const { audiusSdk } = useQueryContext()
  const { data: userId } = useCurrentUserId()

  return useQuery({
    queryKey: getAudioTransactionsCountQueryKey(userId),
    queryFn: async () => {
      if (!userId) return 0

      const sdk = await audiusSdk()
      const response = await sdk.users.getAudioTransactionCount({
        id: Id.parse(userId)
      })

      return response.data ?? 0
    },
    ...options,
    enabled: options?.enabled !== false && !!userId
  })
}
