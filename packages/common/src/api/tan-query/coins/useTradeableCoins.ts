import { useMemo } from 'react'

import type { InfiniteData } from '@tanstack/react-query'

import { transformArtistCoinsToTokenInfoMap, useQueryContext } from '~/api'
import type { CoinInfo } from '~/store'
import { TOKEN_LISTING_MAP } from '~/store/ui/shared/tokenConstants'

import type { Coin } from '../../../adapters/coin'

import { useArtistCoins } from './useArtistCoins'
import { useWalletCoins } from './useWalletCoins'

export const TEMP_ARTIST_COINS_PAGE_SIZE = 100

export type TradeableCoinsContext = 'pay' | 'receive' | 'all'

export type UseTradeableCoinsParams = {
  context?: TradeableCoinsContext
  excludeSymbols?: string[]
  onlyOwned?: boolean
  ownedAddresses?: Set<string>
  /** External wallet address to fetch coins for (e.g. Phantom, Backpack) */
  externalWalletAddress?: string | null
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
    onlyOwned = false,
    ownedAddresses = new Set(),
    externalWalletAddress
  } = params ?? {}

  const { env } = useQueryContext()

  // Fetch external wallet coins if external wallet is provided
  const {
    data: externalWalletCoins = [],
    isLoading: isExternalWalletCoinsLoading,
    error: externalWalletCoinsError
  } = useWalletCoins({ walletAddress: externalWalletAddress })

  const {
    data: artistCoinsRaw = [],
    isPending: isArtistCoinsLoading,
    error: artistCoinsError
  } = useArtistCoins<CoinInfo[]>(
    { pageSize: TEMP_ARTIST_COINS_PAGE_SIZE },
    {
      select: (data: InfiniteData<Coin[], number>) => {
        // First flatten the pages
        const coins = data.pages.flat()

        // Transform to CoinInfo map and return as array
        const coinsMap = transformArtistCoinsToTokenInfoMap(coins)
        return Object.values(coinsMap)
      }
    }
  )

  // Merge coins with USDC/SOL and apply filtering
  const processedCoins = useMemo(() => {
    // Use external wallet coins if available, otherwise use artist coins
    const baseCoins: CoinInfo[] = externalWalletAddress
      ? // For external wallets, transform wallet coins to CoinInfo
        externalWalletCoins.map((coin) => ({
          symbol: coin.ticker,
          name: coin.ticker,
          decimals: coin.decimals,
          balance: coin.balance,
          address: coin.mint,
          logoURI: coin.logoUri ?? undefined,
          isStablecoin: coin.ticker === 'USDC'
        }))
      : // For internal wallets, use artist coins
        artistCoinsRaw

    // Create a map for efficient lookup and add USDC/SOL
    const coinsMap = new Map(baseCoins.map((coin) => [coin.address, coin]))

    // Add USDC for all wallets
    const usdcToken = TOKEN_LISTING_MAP.USDC
    coinsMap.set(env.USDC_MINT_ADDRESS, {
      ...usdcToken,
      balance: null
    })

    // Only add SOL for external wallets
    if (externalWalletAddress) {
      const solToken = TOKEN_LISTING_MAP.SOL
      coinsMap.set(solToken.address, {
        ...solToken,
        balance: null
      })
    }

    // Convert map to array for filtering
    let filteredCoins = Array.from(coinsMap.values())

    // Apply context and parameter-based filters
    if (excludeSymbols.length > 0) {
      filteredCoins = filteredCoins.filter(
        (coin) => !excludeSymbols.includes(coin.symbol)
      )
    }

    if (onlyOwned) {
      filteredCoins = filteredCoins.filter((coin) =>
        ownedAddresses.has(coin.address)
      )
    }

    if (context === 'pay') {
      // For pay context, filter out USDC (users pay with artist coins)
      filteredCoins = filteredCoins.filter((coin) => coin.symbol !== 'USDC')
    }

    return filteredCoins
  }, [
    externalWalletAddress,
    externalWalletCoins,
    artistCoinsRaw,
    env.USDC_MINT_ADDRESS,
    excludeSymbols,
    onlyOwned,
    ownedAddresses,
    context
  ])

  return useMemo(() => {
    const coinsMap = processedCoins.reduce<Record<string, CoinInfo>>(
      (acc, coin) => {
        acc[coin.symbol] = coin
        return acc
      },
      {}
    )

    return {
      coins: coinsMap,
      coinsArray: processedCoins,
      isLoading: externalWalletAddress
        ? isArtistCoinsLoading || isExternalWalletCoinsLoading
        : isArtistCoinsLoading,
      error: artistCoinsError ?? externalWalletCoinsError ?? null
    }
  }, [
    processedCoins,
    isArtistCoinsLoading,
    isExternalWalletCoinsLoading,
    artistCoinsError,
    externalWalletCoinsError,
    externalWalletAddress
  ])
}
