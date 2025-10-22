import { useMemo } from 'react'

import type { InfiniteData } from '@tanstack/react-query'

import { transformArtistCoinsToTokenInfoMap, useQueryContext } from '~/api'
import type { CoinInfo } from '~/store'

import type { Coin } from '../../../adapters/coin'

import { useArtistCoins } from './useArtistCoins'

export const TEMP_ARTIST_COINS_PAGE_SIZE = 100

export type TradeableCoinsContext = 'pay' | 'receive' | 'all'

export type UseTradeableCoinsParams = {
  context?: TradeableCoinsContext
  excludeSymbols?: string[]
  onlyOwned?: boolean
  ownedAddresses?: Set<string>
}

type TradeableCoinsResult = {
  coins: Record<string, CoinInfo>
  coinsArray: CoinInfo[]
  isLoading: boolean
  error: Error | null
}

// Simple hook to get tokens from API without the complex pair logic
export const useTradeableCoins = (
  params?: UseTradeableCoinsParams
): TradeableCoinsResult => {
  const {
    context = 'all',
    excludeSymbols = [],
    ownedAddresses = new Set()
  } = params ?? {}

  const { env } = useQueryContext()

  const {
    data: artistCoins = [],
    isPending,
    error
  } = useArtistCoins<CoinInfo[]>(
    { pageSize: TEMP_ARTIST_COINS_PAGE_SIZE },
    {
      select: (data: InfiniteData<Coin[], number>) => {
        // First flatten the pages
        const coins = data.pages.flat()

        // Transform to CoinInfo map
        const coinsMap = transformArtistCoinsToTokenInfoMap(coins)

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

        // Convert map to array for filtering
        let coinsArray = Object.values(coinsMap)

        // Apply filters based on context and parameters
        if (excludeSymbols.length > 0) {
          coinsArray = coinsArray.filter(
            (coin) => !excludeSymbols.includes(coin.symbol)
          )
        }

        if (ownedAddresses.size > 0) {
          coinsArray = coinsArray.filter((coin) =>
            ownedAddresses.has(coin.address)
          )
        }

        if (context === 'pay') {
          // For pay context, filter out USDC (users pay with artist coins)
          coinsArray = coinsArray.filter((coin) => coin.symbol !== 'USDC')
        }
        return coinsArray
      }
    }
  )

  return useMemo(() => {
    const coinsMap = artistCoins.reduce<Record<string, CoinInfo>>(
      (acc, coin) => {
        acc[coin.symbol] = coin
        return acc
      },
      {}
    )

    return {
      coins: coinsMap,
      coinsArray: artistCoins,
      isLoading: isPending,
      error: error ?? null
    }
  }, [artistCoins, isPending, error])
}
