import { CoinInfo, CoinPair } from '@audius/common/store'
import { TooltipPlacement } from '@audius/harmony'

export type TransactionData = {
  inputAmount: number
  outputAmount: number
  isValid: boolean
  error: string | null
  isInsufficientBalance: boolean
  exchangeRate?: number | null
  exchangeRateError?: Error | null
  isExchangeRateLoading?: boolean
}

export type UIConfiguration = {
  isDefault?: boolean
  error?: boolean
  errorMessage?: string
  tooltipPlacement?: TooltipPlacement
}

export type TokenPricing = {
  tokenPrice?: string | null
  isTokenPriceLoading?: boolean
  tokenPriceDecimalPlaces?: number
}

export type InputConfiguration = {
  initialInputValue?: string
  onInputValueChange?: (value: string) => void
  min?: number
  max?: number
}

export type TokenSelection = {
  availableInputTokens?: CoinInfo[]
  availableOutputTokens?: CoinInfo[]
  onInputTokenChange?: (symbol: string) => void
  onOutputTokenChange?: (symbol: string) => void
}

export type SwapCallbacks = {
  onTransactionDataChange?: (data: TransactionData) => void
  onChangeSwapDirection?: () => void
}

export type SwapTabProps = {
  tokens: CoinPair
  configuration: UIConfiguration
  pricing: TokenPricing
  input: InputConfiguration
  tokenSelection: TokenSelection
  callbacks: SwapCallbacks
}

export type BaseTabProps = {
  tokenPair: CoinPair
  onTransactionDataChange?: (data: TransactionData) => void
  error?: boolean
  errorMessage?: string
  initialInputValue?: string
  onInputValueChange?: (value: string) => void
}

export type BuyTabProps = BaseTabProps & {
  availableOutputTokens?: CoinInfo[]
  onOutputTokenChange?: (symbol: string) => void
}

export type SellTabProps = BaseTabProps & {
  availableInputTokens?: CoinInfo[]
  onInputTokenChange?: (symbol: string) => void
}

export type ConvertTabProps = BaseTabProps & {
  availableInputTokens?: CoinInfo[]
  availableOutputTokens?: CoinInfo[]
  onInputTokenChange?: (symbol: string) => void
  onOutputTokenChange?: (symbol: string) => void
  onChangeSwapDirection?: () => void
}

export type Screen = 'input' | 'confirm' | 'success'
