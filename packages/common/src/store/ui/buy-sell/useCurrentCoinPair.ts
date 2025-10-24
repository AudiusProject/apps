import { useMemo } from 'react'

import { CoinInfo, CoinPair } from '~/store'

import { createPairFromSymbols } from './utils'

export const useCurrentCoinPair = ({
  baseTokenSymbol,
  quoteTokenSymbol,
  availableCoins,
  selectedPair,
  getPair
}: {
  baseTokenSymbol: string
  quoteTokenSymbol: string
  availableCoins: CoinInfo[]
  selectedPair: CoinPair | null
  getPair?: (baseSymbol: string, quoteSymbol: string) => CoinPair | null
}) => {
  return useMemo(() => {
    // Convert availableTokens array to map for efficient lookup
    const coinMap = availableCoins.reduce(
      (map, coin) => {
        map[coin.symbol] = coin
        return map
      },
      {} as Record<string, CoinInfo>
    )

    // Try to get pair using the efficient API first
    if (getPair) {
      const pair = getPair(baseTokenSymbol, quoteTokenSymbol)
      if (pair) {
        return pair
      }
    }

    // Fallback to creating pair from available tokens
    const pair = createPairFromSymbols(
      baseTokenSymbol,
      quoteTokenSymbol,
      coinMap
    )
    if (pair) {
      return pair
    }

    // Final fallback to selected pair or null
    return selectedPair || null
  }, [availableCoins, getPair, baseTokenSymbol, quoteTokenSymbol, selectedPair])
}
