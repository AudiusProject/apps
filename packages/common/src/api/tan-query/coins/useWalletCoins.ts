import { useQuery } from '@tanstack/react-query'

import { userCoinListFromSDK, type UserCoin } from '~/adapters/coin'

import { QUERY_KEYS } from '../queryKeys'
import type { QueryKey, SelectableQueryOptions } from '../types'
import { useQueryContext } from '../utils/QueryContext'

export type UseWalletCoinsParams = {
  walletAddress: string | undefined | null
  limit?: number
  offset?: number
}

const DEFAULT_LIMIT = 50

export const getWalletCoinsQueryKey = (params: UseWalletCoinsParams) =>
  [
    QUERY_KEYS.walletCoins,
    params.walletAddress,
    { limit: params.limit, offset: params.offset }
  ] as unknown as QueryKey<UserCoin[]>

export const useWalletCoins = <TResult = UserCoin[]>(
  params: UseWalletCoinsParams,
  options?: SelectableQueryOptions<UserCoin[], TResult>
) => {
  const { audiusSdk } = useQueryContext()

  return useQuery({
    queryKey: getWalletCoinsQueryKey(params),
    queryFn: async () => {
      if (!params.walletAddress) {
        return []
      }

      const sdk = await audiusSdk()
      const response = await sdk.wallets.getWalletCoins({
        walletId: params.walletAddress,
        limit: params.limit ?? DEFAULT_LIMIT,
        offset: params.offset ?? 0
      })

      if (response.data) {
        return userCoinListFromSDK(response.data)
      }
      return []
    },
    enabled: options?.enabled !== false && !!params.walletAddress,
    ...options
  })
}
