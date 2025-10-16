import { useMemo } from 'react'

import { buySellMessages as messages } from '~/messages'

import type { BuySellTab, CoinInfo, CoinPair } from './types'
import { createFallbackPair } from './utils'

/**
 * Creates filtered token lists for buy/sell/convert tabs
 */
export const useBuySellTokenFilters = ({
  availableCoins,
  baseTokenSymbol,
  quoteTokenSymbol,
  hasPositiveBalance
}: {
  availableCoins: CoinInfo[]
  baseTokenSymbol: string
  quoteTokenSymbol: string
  hasPositiveBalance: (tokenAddress: string) => boolean
}) => {
  const availableInputTokensForSell = useMemo(() => {
    return availableCoins.filter(
      (t) =>
        t.symbol !== baseTokenSymbol &&
        t.symbol !== 'USDC' &&
        hasPositiveBalance(t.address)
    )
  }, [availableCoins, baseTokenSymbol, hasPositiveBalance])

  const availableInputTokensForConvert = useMemo(() => {
    return availableCoins.filter(
      (t) =>
        t.symbol !== baseTokenSymbol &&
        t.symbol !== quoteTokenSymbol &&
        hasPositiveBalance(t.address)
    )
  }, [availableCoins, baseTokenSymbol, quoteTokenSymbol, hasPositiveBalance])

  const availableOutputTokensForConvert = useMemo(() => {
    return availableCoins.filter((t) => t.symbol !== baseTokenSymbol)
  }, [availableCoins, baseTokenSymbol])

  return {
    availableInputTokensForSell,
    availableInputTokensForConvert,
    availableOutputTokensForConvert
  }
}

/**
 * Creates a safe token pair, falling back to AUDIO/USDC if needed
 */
export const useSafeTokenPair = (currentTokenPair: CoinPair | null) => {
  return useMemo(() => {
    if (currentTokenPair?.baseToken && currentTokenPair?.quoteToken) {
      return currentTokenPair
    }
    return createFallbackPair()
  }, [currentTokenPair])
}

/**
 * Creates the tabs array for buy/sell/convert
 */
export const buySellTabsArray = [
  { key: 'buy' as BuySellTab, text: messages.buy },
  { key: 'sell' as BuySellTab, text: messages.sell },
  { key: 'convert' as BuySellTab, text: messages.convert }
]
