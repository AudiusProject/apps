import { Id } from '@audius/sdk'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import { userCoinListFromSDK, type UserCoin } from '~/adapters/coin'
import { ID } from '~/models'

import { QUERY_KEYS } from '../queryKeys'
import { SelectableQueryOptions } from '../types'
import { useQueryContext } from '../utils'

import { getUserCoinQueryKey } from './useUserCoin'

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
        // Prime per-mint caches so consumers of useUserCoin (e.g. wallet-page
        // rows) read from this bulk response instead of each firing their own
        // request.
        coins.forEach((coin) => {
          if (!coin.accounts) return
          queryClient.setQueryData(
            getUserCoinQueryKey(coin.mint, params.userId ?? null),
            {
              mint: coin.mint,
              ticker: coin.ticker,
              decimals: coin.decimals,
              logoUri: coin.logoUri,
              balance: coin.balance,
              balanceUsd: coin.balanceUsd,
              accounts: coin.accounts
            }
          )
        })
        return coins
      }
      return []
    },
    ...options,
    enabled: !!params.userId && options?.enabled !== false
  })
}
