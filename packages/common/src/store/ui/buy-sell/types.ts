import type { ComponentType } from 'react'

import type { TooltipPlacement } from '@audius/harmony'

export type BuySellTab = 'buy' | 'sell' | 'convert'

export type Screen = 'input' | 'confirm' | 'success'

export type TokenType = 'AUDIO' | 'USDC' | 'BONK'

export type CoinInfo = {
  symbol: string
  name: string
  icon?: ComponentType<any>
  logoURI?: string
  decimals: number
  balance: number | null
  address: string
  isStablecoin?: boolean
}

export type CoinPair = {
  baseToken: CoinInfo
  quoteToken: CoinInfo
  exchangeRate: number | null
}

export type TokenAmountSectionProps = {
  title: string
  tokenInfo: CoinInfo
  isInput: boolean
  amount: number | string
  onAmountChange?: (value: string) => void
  onMaxClick?: () => void
  availableBalance: number
  exchangeRate?: number | null
  placeholder?: string
  isDefault?: boolean
  error?: boolean
  errorMessage?: string
  tokenPrice?: string | null
  isTokenPriceLoading?: boolean
  tokenPriceDecimalPlaces?: number
  tooltipPlacement?: TooltipPlacement
  onChangeSwapDirection?: () => void
}

export type SuccessDisplayData = {
  payTokenInfo: CoinInfo
  receiveTokenInfo: CoinInfo
  payAmount: number
  receiveAmount: number
  pricePerBaseToken: number
  baseTokenSymbol: string
  exchangeRate?: number | null
}

export type ConfirmationScreenData = {
  payTokenInfo: CoinInfo
  receiveTokenInfo: CoinInfo
  payAmount: number
  receiveAmount: number
  pricePerBaseToken: number
  baseTokenSymbol: string
  exchangeRate?: number | null
}

export type SwapResult = {
  inputAmount: number
  outputAmount: number
  signature?: string
}

export type TransactionData = {
  inputAmount: number
  outputAmount: number
  isValid: boolean
  error?: string | null
  exchangeRate?: number | null
  exchangeRateError?: Error | null
  isExchangeRateLoading?: boolean
} | null

export const getSwapTokens = (activeTab: BuySellTab, tokenPair: CoinPair) => {
  return {
    inputToken:
      activeTab === 'buy'
        ? tokenPair.quoteToken.symbol
        : tokenPair.baseToken.symbol,
    outputToken:
      activeTab === 'buy'
        ? tokenPair.baseToken.symbol
        : tokenPair.quoteToken.symbol,
    inputTokenInfo:
      activeTab === 'buy' ? tokenPair.quoteToken : tokenPair.baseToken,
    outputTokenInfo:
      activeTab === 'buy' ? tokenPair.baseToken : tokenPair.quoteToken
  }
}
