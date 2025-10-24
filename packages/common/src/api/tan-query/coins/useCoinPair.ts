import { queryOptions, useQuery } from '@tanstack/react-query'

import { CoinPair } from '~/store'
import {
  createFallbackPair,
  findTokenBySymbol,
  findTokenByAddress
} from '~/store/ui/buy-sell/utils'

import { QUERY_KEYS } from '../queryKeys'

import { useTradeableCoins } from './useTradeableCoins'

export interface UseCoinPairParams {
  baseSymbol?: string
  quoteSymbol?: string
  baseAddress?: string
  quoteAddress?: string
}

const getTokenPairQueryKey = (
  baseIdentifier: string,
  quoteIdentifier: string,
  lookupType: 'symbol' | 'address'
) =>
  [QUERY_KEYS.tokenPair, lookupType, baseIdentifier, quoteIdentifier] as const

/**
 * Helper function to get the query options for fetching a coin pair.
 * Useful for getting the query key tagged with the data type stored in the cache.
 */
export const getTokenPairOptions = ({
  baseSymbol,
  quoteSymbol,
  baseAddress,
  quoteAddress
}: UseCoinPairParams) => {
  const lookupType = baseAddress && quoteAddress ? 'address' : 'symbol'
  const baseIdentifier =
    lookupType === 'address' ? baseAddress! : baseSymbol || 'AUDIO'
  const quoteIdentifier =
    lookupType === 'address' ? quoteAddress! : quoteSymbol || 'USDC'

  return queryOptions({
    queryKey: getTokenPairQueryKey(baseIdentifier, quoteIdentifier, lookupType),
    queryFn: async (): Promise<CoinPair | null> => null, // Will be overridden in hook
    enabled: !!(baseIdentifier && quoteIdentifier)
  })
}

export const useCoinPair = (
  params: UseCoinPairParams = {},
  options?: Partial<ReturnType<typeof getTokenPairOptions>>
) => {
  const { coins: coinsMap, isLoading: coinsLoading } = useTradeableCoins()

  const { baseSymbol, quoteSymbol, baseAddress, quoteAddress } = params

  const lookupType = baseAddress && quoteAddress ? 'address' : 'symbol'
  const baseIdentifier =
    lookupType === 'address' ? baseAddress! : baseSymbol || 'AUDIO'
  const quoteIdentifier =
    lookupType === 'address' ? quoteAddress! : quoteSymbol || 'USDC'

  const queryResult = useQuery({
    ...options,
    ...getTokenPairOptions(params),
    queryFn: async () => {
      if (Object.keys(coinsMap).length === 0) {
        return null
      }

      const baseToken =
        lookupType === 'symbol'
          ? findTokenBySymbol(baseIdentifier, coinsMap)
          : findTokenByAddress(baseIdentifier, coinsMap)

      const quoteToken =
        lookupType === 'symbol'
          ? findTokenBySymbol(quoteIdentifier, coinsMap)
          : findTokenByAddress(quoteIdentifier, coinsMap)

      if (!baseToken || !quoteToken || baseToken.symbol === quoteToken.symbol) {
        return null
      }

      return {
        baseToken,
        quoteToken,
        exchangeRate: null
      } as CoinPair
    },
    enabled:
      !coinsLoading &&
      Object.keys(coinsMap).length > 0 &&
      !!(baseIdentifier && quoteIdentifier)
  })

  return {
    ...queryResult,
    data: queryResult.data || createFallbackPair()
  }
}

// Hook for getting default AUDIO/USDC pair
export const useDefaultTokenPair = (
  options?: Partial<ReturnType<typeof getTokenPairOptions>>
) => {
  return useCoinPair({ baseSymbol: 'AUDIO', quoteSymbol: 'USDC' }, options)
}
