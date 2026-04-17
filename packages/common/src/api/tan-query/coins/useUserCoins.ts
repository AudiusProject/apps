import { Id } from '@audius/sdk'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import { userCoinListFromSDK, type UserCoin } from '~/adapters/coin'
import { ID } from '~/models'

import { QUERY_KEYS } from '../queryKeys'
import { SelectableQueryOptions } from '../types'
import { useQueryContext } from '../utils'

import { primeUserCoinQueriesFromList } from './primeUserCoinQueriesFromList'

/** Matches OpenAPI max; use for wallet-style lists that need one stable query key. */
export const USER_COINS_WALLET_LIST_PARAMS = {
  limit: 100,
  offset: 0
} as const

export interface UseUserCoinsParams {
  userId: ID | undefined | null
  limit?: number
  offset?: number
}

export type { UserCoin }

export const useUserCoins = <TResult = UserCoin[]>(
  params: UseUserCoinsParams,
  options?: SelectableQueryOptions<UserCoin[], TResult>
) => {
  const { audiusSdk } = useQueryContext()
  const queryClient = useQueryClient()

  return useQuery({
    queryKey: [QUERY_KEYS.userCoins, params],
    queryFn: async () => {
      const sdk = await audiusSdk()
      const response = await sdk.users.getUserCoins({
        id: Id.parse(params.userId),
        limit: params.limit,
        offset: params.offset
      })
      if (response.data) {
        const coins = userCoinListFromSDK(response.data)
        if (params.userId && coins.length > 0) {
          primeUserCoinQueriesFromList(queryClient, params.userId, coins)
        }
        return coins
      }
      return []
    },
    ...options,
    enabled: !!params.userId && options?.enabled !== false
  })
}
