import { useMemo, useState } from 'react'

import { BuySellTab, TokenPair } from '~/store'

export const useTokenStates = (selectedPair: TokenPair | null) => {
  // State for user-initiated token changes - only track overrides
  const [userOverrides, setUserOverrides] = useState<{
    buy?: { baseToken?: string; quoteToken?: string }
    sell?: { baseToken?: string; quoteToken?: string }
    convert?: { baseToken?: string; quoteToken?: string }
  }>({})

  // Compute default tokens from selectedPair or fallback defaults
  const defaultTokens = useMemo(() => {
    const baseSymbol = selectedPair?.baseToken?.symbol ?? 'AUDIO'
    const quoteSymbol = selectedPair?.quoteToken?.symbol ?? 'USDC'

    let convertQuoteDefault = 'USDC'
    if (
      selectedPair?.baseToken?.symbol &&
      selectedPair.baseToken.symbol !== 'AUDIO'
    ) {
      convertQuoteDefault = selectedPair.baseToken.symbol
    } else if (
      selectedPair?.quoteToken?.symbol &&
      selectedPair.quoteToken.symbol !== 'AUDIO'
    ) {
      convertQuoteDefault = selectedPair.quoteToken.symbol
    }

    return {
      buy: { baseToken: baseSymbol, quoteToken: quoteSymbol },
      sell: { baseToken: baseSymbol, quoteToken: quoteSymbol },
      convert: {
        baseToken: 'AUDIO',
        quoteToken: convertQuoteDefault
      }
    }
  }, [selectedPair?.baseToken?.symbol, selectedPair?.quoteToken?.symbol])

  // Merge defaults with user overrides
  const buyTabTokens = useMemo(
    () => ({
      baseToken: userOverrides.buy?.baseToken ?? defaultTokens.buy.baseToken,
      quoteToken: userOverrides.buy?.quoteToken ?? defaultTokens.buy.quoteToken
    }),
    [userOverrides.buy, defaultTokens.buy]
  )

  const sellTabTokens = useMemo(
    () => ({
      baseToken: userOverrides.sell?.baseToken ?? defaultTokens.sell.baseToken,
      quoteToken:
        userOverrides.sell?.quoteToken ?? defaultTokens.sell.quoteToken
    }),
    [userOverrides.sell, defaultTokens.sell]
  )

  const convertTabTokens = useMemo(
    () => ({
      baseToken:
        userOverrides.convert?.baseToken ?? defaultTokens.convert.baseToken,
      quoteToken:
        userOverrides.convert?.quoteToken ?? defaultTokens.convert.quoteToken
    }),
    [userOverrides.convert, defaultTokens.convert]
  )

  // Get current tab's token symbols
  const getCurrentTabTokens = (activeTab: BuySellTab) => {
    return activeTab === 'buy'
      ? buyTabTokens
      : activeTab === 'sell'
        ? sellTabTokens
        : convertTabTokens
  }

  // Handle token changes
  const handleInputTokenChange = (symbol: string, activeTab: BuySellTab) => {
    setUserOverrides((prev) => {
      const newOverrides = { ...prev }

      if (activeTab === 'sell') {
        // On sell tab, input token change means base token change
        newOverrides.sell = { ...prev.sell, baseToken: symbol }
      } else if (activeTab === 'buy') {
        // On buy tab, input token change means quote token change
        newOverrides.buy = { ...prev.buy, quoteToken: symbol }
      } else {
        // On convert tab, input token change means base token change
        newOverrides.convert = { ...prev.convert, baseToken: symbol }
      }

      return newOverrides
    })
  }

  const handleOutputTokenChange = (symbol: string, activeTab: BuySellTab) => {
    setUserOverrides((prev) => {
      const newOverrides = { ...prev }

      if (activeTab === 'buy') {
        // On buy tab, output token change means base token change
        newOverrides.buy = { ...prev.buy, baseToken: symbol }
      } else if (activeTab === 'sell') {
        // On sell tab, output token change means quote token change
        newOverrides.sell = { ...prev.sell, quoteToken: symbol }
      } else {
        // On convert tab, output token change means quote token change
        newOverrides.convert = { ...prev.convert, quoteToken: symbol }
      }

      return newOverrides
    })
  }

  const handleSwapDirection = (activeTab: BuySellTab) => {
    if (activeTab !== 'convert') return

    setUserOverrides((prev) => {
      const currentTokens = prev.convert ?? defaultTokens.convert
      const newOverrides = { ...prev }

      // Swap base and quote tokens for convert tab
      newOverrides.convert = {
        baseToken: currentTokens.quoteToken,
        quoteToken: currentTokens.baseToken
      }

      return newOverrides
    })
  }

  return {
    buyTabTokens,
    sellTabTokens,
    convertTabTokens,
    getCurrentTabTokens,
    handleInputTokenChange,
    handleOutputTokenChange,
    handleSwapDirection
  }
}
