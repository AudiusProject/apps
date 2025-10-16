import { useMemo } from 'react'

import { transformArtistCoinsToTokenInfoMap, useQueryContext } from '~/api'

import { useArtistCoins } from './useArtistCoins'

export const TEMP_ARTIST_COINS_PAGE_SIZE = 100

// Simple hook to get tokens from API without the complex pair logic
export const useTradeableCoins = () => {
  const {
    data: artistCoins = [],
    isLoading,
    error
  } = useArtistCoins({ pageSize: TEMP_ARTIST_COINS_PAGE_SIZE })
  const { env } = useQueryContext()

  return useMemo(() => {
    const coinsMap = transformArtistCoinsToTokenInfoMap(artistCoins)

    // Add USDC manually since it's frontend-only and not from API
    coinsMap.USDC = {
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
      balance: null,
      address: env.USDC_MINT_ADDRESS,
      logoURI:
        'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png',
      isStablecoin: true
    }

    return {
      coins: coinsMap,
      isLoading,
      error
    }
  }, [artistCoins, isLoading, error, env.USDC_MINT_ADDRESS])
}
