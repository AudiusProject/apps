import { useMemo } from 'react'

import { CoinInfo, CoinPair } from '~/store'

export const useAvailableCoins = ({
  coins,
  supportedTokenPairs,
  isCoinDataLoading
}: {
  coins: Record<string, CoinInfo>
  supportedTokenPairs: CoinPair[]
  isCoinDataLoading: boolean
}) => {
  return useMemo(() => {
    if (isCoinDataLoading || Object.keys(coins).length === 0) {
      return []
    }

    const tokensSet = new Set<string>()
    supportedTokenPairs.forEach((pair) => {
      tokensSet.add(pair.baseToken.symbol)
      tokensSet.add(pair.quoteToken.symbol)
    })
    return Array.from(tokensSet)
      .map((symbol) => Object.values(coins).find((c) => c.symbol === symbol))
      .filter(Boolean) as CoinInfo[]
  }, [coins, supportedTokenPairs, isCoinDataLoading])
}
