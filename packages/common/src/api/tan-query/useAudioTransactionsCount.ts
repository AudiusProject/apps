import { Id } from '@audius/sdk'
import { useQuery } from '@tanstack/react-query'

import { useAudiusQueryContext } from '~/audius-query'
import { ID } from '~/models'
import { Nullable } from '~/utils/typeUtils'

import { QUERY_KEYS } from './queryKeys'
import { SelectableQueryOptions } from './types'
import { useCurrentUserId } from './useCurrentUserId'

export const getAudioTransactionsCountQueryKey = (userId: Nullable<ID>) => [
  QUERY_KEYS.audioTransactionsCount,
  userId
]

export const useAudioTransactionsCount = <TResult = number>(
  options?: SelectableQueryOptions<number, TResult>
) => {
  const { audiusSdk } = useAudiusQueryContext()
  const { data: userId } = useCurrentUserId()

  return useQuery({
    queryKey: getAudioTransactionsCountQueryKey(userId),
    queryFn: async () => {
      if (!userId) return 0

      const sdk = await audiusSdk()
      const response = await sdk.full.users.getAudioTransactionCount({
        id: Id.parse(userId)
      })

      return response.data ?? 0
    },
    ...options,
    enabled: options?.enabled !== false && !!userId
  })
}
