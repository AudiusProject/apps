import { ResponseError } from '@audius/sdk'
import { useQuery } from '@tanstack/react-query'

import { QUERY_KEYS } from '../queryKeys'
import { QueryKey, QueryOptions } from '../types'
import { useQueryContext } from '../utils/QueryContext'

type CoinRedeemAmountData = {
  amount: number
}

type CoinRedeemAmountErrorResponse = {
  error: string
}

export const getCoinRedeemAmountQueryKey = (mint: string | null | undefined) =>
  [QUERY_KEYS.coinRedeemAmount, mint] as unknown as QueryKey<
    CoinRedeemAmountData | CoinRedeemAmountErrorResponse | null
  >

export const useCoinRedeemAmount = (
  { mint }: { mint: string | null | undefined },
  options?: QueryOptions
) => {
  const { audiusSdk } = useQueryContext()

  return useQuery({
    queryKey: getCoinRedeemAmountQueryKey(mint),
    queryFn: async () => {
      const sdk = await audiusSdk()
      if (!mint) return null

      try {
        const coinAmountResponse = await sdk.coins.getCoinRedeemAmount({ mint })

        return coinAmountResponse
      } catch (error) {
        // Handle 400 errors
        // Tells us if the coin is not redeemable anymore
        if (error instanceof ResponseError) {
          return { error: 'ended' }
        }

        console.error({ error })
        return null
      }
    },
    ...options,
    enabled: options?.enabled !== false && !!mint
  })
}
