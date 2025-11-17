import { ResponseError } from '@audius/sdk'
import { useQuery } from '@tanstack/react-query'

import { QUERY_KEYS } from '../queryKeys'
import { QueryKey, QueryOptions } from '../types'
import { useQueryContext } from '../utils/QueryContext'

type CoinRedeemCodeAmountData = {
  code: string
  amount: number
}

type CoinRedeemCodeAmountErrorResponse = {
  error: string
}

export const getCoinRedeemCodeAmountQueryKey = (
  mint: string | null | undefined,
  code: string | null | undefined
) =>
  [QUERY_KEYS.coinRedeemCodeAmount, mint, code] as unknown as QueryKey<
    CoinRedeemCodeAmountData | CoinRedeemCodeAmountErrorResponse | null
  >

export const useCoinRedeemCodeAmount = (
  {
    mint,
    code
  }: { mint: string | null | undefined; code: string | null | undefined },
  options?: QueryOptions
) => {
  const { audiusSdk } = useQueryContext()

  return useQuery({
    queryKey: getCoinRedeemCodeAmountQueryKey(mint, code),
    queryFn: async () => {
      const sdk = await audiusSdk()
      if (!mint || !code) return null

      try {
        const codeAmountResponse = await sdk.coins.getRewardCode({ mint, code })

        return codeAmountResponse
      } catch (error) {
        // Handle 400 errors
        // Tells us if the code is invalid or already redeemed
        if (error instanceof ResponseError && error.response.status === 400) {
          const res = await error.response.json()
          return res
        }

        console.error({ error })
        return null
      }
    },
    ...options,
    enabled: options?.enabled !== false && !!mint && !!code
  })
}
