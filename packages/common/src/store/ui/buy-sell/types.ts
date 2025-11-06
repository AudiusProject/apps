import type { ComponentType } from 'react'

import { TooltipPlacement } from 'antd/lib/tooltip'

export type BuySellTab = 'buy' | 'sell' | 'convert'

export type Screen = 'input' | 'confirm' | 'success'

export type TokenType = 'AUDIO' | 'USDC' | 'BONK'

export type CoinInfo = {
  symbol: string // e.g., 'AUDIO', 'USDC', 'WETH'
  name: string // e.g., 'Audius', 'USD Coin', 'Wrapped Ether'
  icon?: ComponentType<any> // Component for the token's icon (optional to avoid circular deps)
  logoURI?: string // URL for the token's logo image
  decimals: number // Number of decimal places (e.g., 18 for ETH)
  balance: number | null // User's balance for this token
  address: string // Contract/mint address (required for token identification)
  isStablecoin?: boolean // Flag for UI formatting ($ prefix, etc.)
}

export type CoinPair = {
  baseToken: CoinInfo // The token being priced (e.g., AUDIO)
  quoteToken: CoinInfo // The token used for pricing (e.g., USDC)
  exchangeRate: number | null // Rate of baseToken in terms of quoteToken
}

// This type might be web-specific if TokenAmountSection is not made common.
// For now, keeping it as per original types.ts content.
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

/**
 * Utility function to get input and output tokens based on active tab and token pair
 * For 'buy': user pays with quote token (e.g., USDC) to get base token (e.g., AUDIO)
 * For 'sell': user pays with base token (e.g., AUDIO) to get quote token (e.g., USDC)
 * For 'convert': user pays with base token (e.g., AUDIO) to get quote token (e.g., BONK)
 */
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
