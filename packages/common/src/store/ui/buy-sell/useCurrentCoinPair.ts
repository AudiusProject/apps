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
    const coinMap = availableCoins.reduce(
      (map, coin) => {
        map[coin.symbol] = coin
        return map
      },
      {} as Record<string, CoinInfo>
    )

    if (getPair) {
      const pair = getPair(baseTokenSymbol, quoteTokenSymbol)
      if (pair) {
        return pair
      }
    }

    const pair = createPairFromSymbols(
      baseTokenSymbol,
      quoteTokenSymbol,
      coinMap
    )
    if (pair) {
      return pair
    }

    return selectedPair || null
  }, [availableCoins, getPair, baseTokenSymbol, quoteTokenSymbol, selectedPair])
}
