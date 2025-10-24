import { useMemo } from 'react'

import { buySellMessages as messages } from '~/messages'

import type { BuySellTab, CoinPair } from './types'
import { createFallbackPair } from './utils'

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
