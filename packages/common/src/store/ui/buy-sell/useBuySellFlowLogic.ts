import { useMemo } from 'react'

import { buySellMessages as messages } from '~/messages'

import type { BuySellTab, TokenInfo, TokenPair } from './types'
import { createFallbackPair } from './utils'

/**
 * Creates filtered token lists for buy/sell/convert tabs
 */
export const useBuySellTokenFilters = ({
  availableTokens,
  baseTokenSymbol,
  quoteTokenSymbol,
  hasPositiveBalance
}: {
  availableTokens: TokenInfo[]
  baseTokenSymbol: string
  quoteTokenSymbol: string
  hasPositiveBalance: (tokenAddress: string) => boolean
}) => {
  const availableInputTokensForSell = useMemo(() => {
    return availableTokens.filter(
      (t) =>
        t.symbol !== baseTokenSymbol &&
        t.symbol !== 'USDC' &&
        hasPositiveBalance(t.address)
    )
  }, [availableTokens, baseTokenSymbol, hasPositiveBalance])

  const availableInputTokensForConvert = useMemo(() => {
    return availableTokens.filter(
      (t) =>
        t.symbol !== baseTokenSymbol &&
        t.symbol !== quoteTokenSymbol &&
        hasPositiveBalance(t.address)
    )
  }, [availableTokens, baseTokenSymbol, quoteTokenSymbol, hasPositiveBalance])

  const availableOutputTokensForConvert = useMemo(() => {
    return availableTokens.filter((t) => t.symbol !== baseTokenSymbol)
  }, [availableTokens, baseTokenSymbol])

  return {
    availableInputTokensForSell,
    availableInputTokensForConvert,
    availableOutputTokensForConvert
  }
}

/**
 * Creates a safe token pair, falling back to AUDIO/USDC if needed
 */
export const useSafeTokenPair = (currentTokenPair: TokenPair | null) => {
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
