import { queryOptions, useQuery } from '@tanstack/react-query'

import {
  TEMP_ARTIST_COINS_PAGE_SIZE,
  transformArtistCoinsToTokenInfoMap
} from '~/api'
import { TokenPair } from '~/store'
import {
  createFallbackPair,
  findTokenBySymbol,
  findTokenByAddress
} from '~/store/ui/buy-sell/utils'

import { useArtistCoins } from '../coins/useArtistCoins'
import { QUERY_KEYS } from '../queryKeys'
import { useQueryContext } from '../utils/QueryContext'

export interface UseTokenPairParams {
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
 * Helper function to get the query options for fetching a token pair.
 * Useful for getting the query key tagged with the data type stored in the cache.
 */
export const getTokenPairOptions = ({
  baseSymbol,
  quoteSymbol,
  baseAddress,
  quoteAddress
}: UseTokenPairParams) => {
  const lookupType = baseAddress && quoteAddress ? 'address' : 'symbol'
  const baseIdentifier =
    lookupType === 'address' ? baseAddress! : baseSymbol || 'AUDIO'
  const quoteIdentifier =
    lookupType === 'address' ? quoteAddress! : quoteSymbol || 'USDC'

  return queryOptions({
    queryKey: getTokenPairQueryKey(baseIdentifier, quoteIdentifier, lookupType),
    queryFn: async (): Promise<TokenPair | null> => null, // Will be overridden in hook
    enabled: !!(baseIdentifier && quoteIdentifier)
  })
}

export const useTokenPair = (
  params: UseTokenPairParams = {},
  options?: Partial<ReturnType<typeof getTokenPairOptions>>
) => {
  const context = useQueryContext()
  const { data: artistCoins = [], isLoading: coinsLoading } = useArtistCoins({
    pageSize: TEMP_ARTIST_COINS_PAGE_SIZE
  })

  // Create tokens map
  const tokensMap = transformArtistCoinsToTokenInfoMap(artistCoins)

  // Add USDC manually since it's frontend-only and not from API
  tokensMap.USDC = {
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    balance: null,
    address: context.env.USDC_MINT_ADDRESS,
    logoURI:
      'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png',
    isStablecoin: true
  }

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
      if (Object.keys(tokensMap).length === 0) {
        return null
      }

      const baseToken =
        lookupType === 'symbol'
          ? findTokenBySymbol(baseIdentifier, tokensMap)
          : findTokenByAddress(baseIdentifier, tokensMap)

      const quoteToken =
        lookupType === 'symbol'
          ? findTokenBySymbol(quoteIdentifier, tokensMap)
          : findTokenByAddress(quoteIdentifier, tokensMap)

      if (!baseToken || !quoteToken || baseToken.symbol === quoteToken.symbol) {
        return null
      }

      return {
        baseToken,
        quoteToken,
        exchangeRate: null
      } as TokenPair
    },
    enabled:
      !coinsLoading &&
      Object.keys(tokensMap).length > 0 &&
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
  return useTokenPair({ baseSymbol: 'AUDIO', quoteSymbol: 'USDC' }, options)
}
