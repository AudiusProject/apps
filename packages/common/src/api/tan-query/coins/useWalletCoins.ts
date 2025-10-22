import { PublicKey } from '@solana/web3.js'
import { useQuery } from '@tanstack/react-query'

import { userCoinListFromSDK, type UserCoin } from '~/adapters/coin'
import { TOKEN_LISTING_MAP } from '~/store/ui/shared/tokenConstants'

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

      // Fetch Solana balance
      let solBalance = 0
      let solBalanceUsd = 0
      try {
        const addressPubKey = new PublicKey(params.walletAddress)
        const connection = sdk.services.solanaClient.connection
        const balance = await connection.getBalance(addressPubKey)
        solBalance = balance
        // TODO: Calculate USD value if needed
        solBalanceUsd = 0
      } catch (e) {
        console.error('Error fetching SOL balance:', e)
      }

      if (response.data) {
        const coins = userCoinListFromSDK(response.data)

        // Add SOL coin entry if there's a balance or if it's not already in the list
        const hasSolCoin = coins.some((coin) => coin.ticker === 'SOL')
        if (!hasSolCoin && solBalance > 0) {
          coins.unshift({
            mint: TOKEN_LISTING_MAP.SOL.address,
            ticker: TOKEN_LISTING_MAP.SOL.symbol,
            decimals: TOKEN_LISTING_MAP.SOL.decimals,
            ownerId: 0, // SOL is not owned by any user
            logoUri: TOKEN_LISTING_MAP.SOL.logoURI,
            hasDiscord: false,
            balance: solBalance,
            balanceUsd: solBalanceUsd
          })
        }

        return coins
      }
      return []
    },
    enabled: options?.enabled !== false && !!params.walletAddress,
    ...options
  })
}
