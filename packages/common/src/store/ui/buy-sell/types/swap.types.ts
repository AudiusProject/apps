/**
 * Core types for token swap functionality
 */

export type CoinInfo = {
  address: string
  symbol: string
  name: string
  decimals: number
  isStablecoin?: boolean
}

export type ExchangeRateData = {
  rate: number
  inputAmount: {
    uiAmount: number
  }
}

export type BalanceData = {
  balance: number
  formattedBalance: string
}

/**
 * State machine types for bidirectional calculations
 */
export type CalculationSource = 'input' | 'output' | null

export type CalculationState =
  | { type: 'input-driven'; inputAmount: number; source: 'input' }
  | { type: 'output-driven'; outputAmount: number; source: 'output' }
  | { type: 'idle'; source: null }

export type CalculationInput = {
  amount: number
  source: CalculationSource
  exchangeRate: number | null
}

export type CalculationResult = {
  inputAmount: number
  outputAmount: number
  source: CalculationSource
  isValid: boolean
}

/**
 * Token limit calculation types
 */
export type TokenLimits = {
  min: number
  max: number
}

export type TokenLimitInput = {
  tokenPrice: number | null
  isStablecoin: boolean
  providedMin?: number
  providedMax?: number
  tokenAddress?: string
}

/**
 * Validation types
 */
export type ValidationErrors = Record<string, string>
export type ValidationWarnings = Record<string, string>
export type ValidationTouched = Record<string, boolean>

export type ValidationResult = {
  isValid: boolean
  errors: ValidationErrors
  warnings: ValidationWarnings
  touched: ValidationTouched
}

export type ValidationInput = {
  inputAmount: string
  balance: number
  limits: TokenLimits
  tokenSymbol: string
  tokenDecimals: number
  isBalanceLoading: boolean
}

/**
 * Data layer types
 */
export type TokenDataHookResult = {
  balance: number
  fullBalance: number
  formattedBalance: string
  exchangeRate: number | null
  displayExchangeRate: number | null
  isBalanceLoading: boolean
  isExchangeRateLoading: boolean
  balanceError: string | null
  exchangeRateError: any
  refetchBalance: () => void
  refetchExchangeRate: () => void
}

export type SwapCalculationsHookResult = {
  inputAmount: string
  outputAmount: string
  numericInputAmount: number
  numericOutputAmount: number
  calculationSource: CalculationSource
  isCalculating: boolean
  handleInputChange: (value: string) => void
  handleOutputChange: (value: string) => void
  resetCalculations: () => void
}

export type SwapValidationHookResult = {
  error: string | null
  isValid: boolean
  isInsufficientBalance: boolean
  validateField: (fieldName: string) => void
  resetValidation: () => void
}

/**
 * Transaction data types
 */
export type TransactionData = {
  inputAmount: number
  outputAmount: number
  isValid: boolean
  error: string | null
  isInsufficientBalance: boolean
  exchangeRate?: number | null
}

/**
 * Form-specific types
 */
export type SwapFormValues = {
  inputAmount: string
  outputAmount: string
}

/**
 * Main hook configuration and result types
 */
export type TokenSwapFormConfig = {
  inputToken: CoinInfo
  outputToken: CoinInfo
  min?: number
  max?: number
  onTransactionDataChange?: (data: TransactionData) => void
  initialInputValue?: string
  onInputValueChange?: (value: string) => void
}

export type TokenSwapFormResult = {
  // Form values
  inputAmount: string
  numericInputAmount: number
  outputAmount: string
  numericOutputAmount: number

  // State
  error: string | null
  exchangeRateError: any
  isExchangeRateLoading: boolean
  isBalanceLoading: boolean

  // Data
  availableBalance: number
  currentExchangeRate: number | null
  displayExchangeRate: number | null
  calculatedLimits: TokenLimits

  // Handlers
  handleInputAmountChange: (value: string) => void
  handleOutputAmountChange: (value: string) => void
  handleMaxClick: () => void

  // Formik integration (maintaining backward compatibility)
  formik: any

  // Token info (maintaining backward compatibility)
  inputToken: CoinInfo
  outputToken: CoinInfo
}
