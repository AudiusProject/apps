import { useCallback, useMemo, useState } from 'react'

import { BuySellTab, CoinPair } from '~/store'

type CoinOverride = { baseToken?: string; quoteToken?: string }
type TabCoinMap = Record<BuySellTab, { baseToken: string; quoteToken: string }>
type CoinType = 'baseToken' | 'quoteToken'

const COIN_UPDATE_CONFIG: Record<
  BuySellTab,
  { input: CoinType; output: CoinType }
> = {
  buy: { input: 'quoteToken', output: 'baseToken' },
  sell: { input: 'baseToken', output: 'quoteToken' },
  convert: { input: 'baseToken', output: 'quoteToken' }
}

export const useCoinStates = (selectedPair: CoinPair | null) => {
  // State for user-initiated token changes - only track overrides
  const [userOverrides, setUserOverrides] = useState<
    Partial<Record<BuySellTab, CoinOverride>>
  >({})

  // Compute default tokens from selectedPair or fallback defaults
  const defaultTokens = useMemo<TabCoinMap>(() => {
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

  const resolvedTokens = useMemo<TabCoinMap>(() => {
    const resolveTab = (tab: BuySellTab) => {
      const overrides = userOverrides[tab]
      const defaults = defaultTokens[tab]

      return {
        baseToken: overrides?.baseToken ?? defaults.baseToken,
        quoteToken: overrides?.quoteToken ?? defaults.quoteToken
      }
    }

    return {
      buy: resolveTab('buy'),
      sell: resolveTab('sell'),
      convert: resolveTab('convert')
    }
  }, [userOverrides, defaultTokens])

  // Get current tab's token symbols
  const getCurrentTabTokens = (activeTab: BuySellTab) =>
    resolvedTokens[activeTab]

  const updateOverrides = useCallback(
    (tab: BuySellTab, overrides: CoinOverride) => {
      setUserOverrides((prev) => ({
        ...prev,
        [tab]: {
          ...prev[tab],
          ...overrides
        }
      }))
    },
    []
  )

  const handleCoinChange = useCallback(
    (tab: BuySellTab, type: 'input' | 'output', symbol: string) => {
      const field = COIN_UPDATE_CONFIG[tab][type]
      updateOverrides(tab, { [field]: symbol } as CoinOverride)
    },
    [updateOverrides]
  )

  // Handle token changes
  const handleInputTokenChange = useCallback(
    (symbol: string, activeTab: BuySellTab) => {
      handleCoinChange(activeTab, 'input', symbol)
    },
    [handleCoinChange]
  )

  const handleOutputTokenChange = useCallback(
    (symbol: string, activeTab: BuySellTab) => {
      handleCoinChange(activeTab, 'output', symbol)
    },
    [handleCoinChange]
  )

  const handleSwapDirection = useCallback(
    (activeTab: BuySellTab) => {
      if (activeTab !== 'convert') return

      setUserOverrides((prev) => ({
        ...prev,
        convert: {
          baseToken: (prev.convert ?? defaultTokens.convert).quoteToken,
          quoteToken: (prev.convert ?? defaultTokens.convert).baseToken
        }
      }))
    },
    [defaultTokens.convert]
  )

  return {
    buyTabTokens: resolvedTokens.buy,
    sellTabTokens: resolvedTokens.sell,
    convertTabTokens: resolvedTokens.convert,
    getCurrentTabTokens,
    handleInputTokenChange,
    handleOutputTokenChange,
    handleSwapDirection
  }
}
