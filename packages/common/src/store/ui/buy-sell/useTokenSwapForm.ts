import { useCallback, useEffect, useMemo } from 'react'

import { useFormik } from 'formik'
import { toFormikValidationSchema } from 'zod-formik-adapter'

import { useTokenExchangeRate, useTokenPrice } from '../../../api'
import type { JupiterTokenSymbol } from '../../../services/Jupiter'

import { MIN_SWAP_AMOUNT_USD, MAX_SWAP_AMOUNT_USD } from './constants'
import { createSwapFormSchema, type SwapFormValues } from './swapFormSchema'
import type { TokenInfo } from './types'

export type BalanceConfig = {
  get: () => number | undefined
  loading: boolean
  formatError: (amount: number) => string
}

// Maximum safe amount for API calls to prevent errors
const MAX_SAFE_EXCHANGE_RATE_AMOUNT = 1000000000000

/**
 * Returns a safe numeric value for exchange rate API calls
 */
const getSafeAmountForExchangeRate = (amount: number): number => {
  return Math.min(amount, MAX_SAFE_EXCHANGE_RATE_AMOUNT)
}

/**
 * Calculates min/max token amounts based on USD limits and current token price
 */
const calculateTokenLimits = (
  tokenPrice: number | null,
  isStablecoin: boolean
): { min: number; max: number } => {
  if (isStablecoin) {
    // For stablecoins like USDC, 1 token ≈ $1 USD
    return {
      min: MIN_SWAP_AMOUNT_USD,
      max: MAX_SWAP_AMOUNT_USD
    }
  }

  if (!tokenPrice || tokenPrice <= 0) {
    // Fallback to reasonable defaults if price is unavailable
    return {
      min: 1,
      max: 1000000
    }
  }

  return {
    min: MIN_SWAP_AMOUNT_USD / tokenPrice,
    max: MAX_SWAP_AMOUNT_USD / tokenPrice
  }
}

export type TokenSwapFormProps = {
  /**
   * The token the user is paying with (input)
   */
  inputToken: TokenInfo
  /**
   * The token the user is receiving (output)
   */
  outputToken: TokenInfo
  /**
   * Minimum amount allowed for input (optional - will be calculated from USD limits if not provided)
   */
  min?: number
  /**
   * Maximum amount allowed for input (optional - will be calculated from USD limits if not provided)
   */
  max?: number
  /**
   * Configuration for handling the input token balance
   */
  balance: BalanceConfig
  /**
   * Callback for when transaction data changes
   */
  onTransactionDataChange?: (data: {
    inputAmount: number
    outputAmount: number
    isValid: boolean
    error: string | null
  }) => void
  /**
   * Initial value for the input field
   */
  initialInputValue?: string
  /**
   * Callback for when input value changes (for persistence)
   */
  onInputValueChange?: (value: string) => void
}

/**
 * A hook to manage the common functionality for token swaps
 */
export const useTokenSwapForm = ({
  inputToken,
  outputToken,
  min: providedMin,
  max: providedMax,
  balance,
  onTransactionDataChange,
  initialInputValue = '',
  onInputValueChange
}: TokenSwapFormProps) => {
  // Get token symbols for the exchange rate API
  const inputTokenSymbol = inputToken.symbol as JupiterTokenSymbol
  const outputTokenSymbol = outputToken.symbol as JupiterTokenSymbol

  const { get: getInputBalance, loading: isBalanceLoading } = balance

  // Get token price for USD-based limit calculations
  const { data: tokenPriceData } = useTokenPrice(inputToken.address)
  const tokenPrice = tokenPriceData?.price
    ? parseFloat(tokenPriceData.price)
    : null

  // Calculate min/max based on USD limits and current price
  const { min, max } = useMemo(() => {
    if (providedMin !== undefined && providedMax !== undefined) {
      return { min: providedMin, max: providedMax }
    }
    return calculateTokenLimits(tokenPrice, inputToken.isStablecoin || false)
  }, [providedMin, providedMax, tokenPrice, inputToken.isStablecoin])

  const availableBalance = useMemo(() => {
    const balance = getInputBalance()
    return balance !== undefined ? balance : (inputToken.balance ?? 0)
  }, [getInputBalance, inputToken.balance])

  // Create validation schema
  const validationSchema = useMemo(() => {
    return toFormikValidationSchema(
      createSwapFormSchema(min, max, availableBalance, inputToken.symbol)
    )
  }, [min, max, availableBalance, inputToken.symbol])

  // Initialize form with Formik
  const formik = useFormik<SwapFormValues>({
    initialValues: {
      inputAmount: initialInputValue,
      outputAmount: '0'
    },
    validationSchema,
    validateOnBlur: true,
    validateOnChange: true,
    onSubmit: () => {
      // The form is never actually submitted - we just use Formik for validation
      // and state management
    }
  })

  const { values, errors, touched, setFieldValue, setFieldTouched } = formik

  // Update form value when initialInputValue changes (tab switch)
  useEffect(() => {
    if (initialInputValue !== values.inputAmount) {
      setFieldValue('inputAmount', initialInputValue, false)
    }
  }, [initialInputValue, values.inputAmount, setFieldValue])

  // Calculate the numeric value of the input amount
  const numericInputAmount = useMemo(() => {
    if (!values.inputAmount) return 0
    const parsed = parseFloat(values.inputAmount)
    return isNaN(parsed) ? 0 : parsed
  }, [values.inputAmount])

  // Use safe amount for exchange rate API calls
  const safeExchangeRateAmount = useMemo(() => {
    return getSafeAmountForExchangeRate(numericInputAmount)
  }, [numericInputAmount])

  const {
    data: exchangeRateData,
    isLoading: isExchangeRateLoading,
    error: exchangeRateError
  } = useTokenExchangeRate({
    inputTokenSymbol,
    outputTokenSymbol,
    inputAmount: safeExchangeRateAmount > 0 ? safeExchangeRateAmount : 1
  })

  // Update output amount when exchange rate or input amount changes
  useEffect(() => {
    if (numericInputAmount <= 0) {
      setFieldValue('outputAmount', '0', false)
      return
    }

    if (!isExchangeRateLoading && exchangeRateData) {
      // Use the actual input amount for output calculation, not the safe amount
      const newAmount = exchangeRateData.rate * numericInputAmount
      setFieldValue('outputAmount', newAmount.toString(), false)
    }
  }, [
    numericInputAmount,
    exchangeRateData,
    isExchangeRateLoading,
    setFieldValue
  ])

  const numericOutputAmount = useMemo(() => {
    if (!values.outputAmount) return 0
    const parsed = parseFloat(values.outputAmount)
    return isNaN(parsed) ? 0 : parsed
  }, [values.outputAmount])

  const currentExchangeRate = exchangeRateData ? exchangeRateData.rate : null

  // Only show error if field has been touched, has a value, and has an error
  // This prevents showing "Required" error when field is empty during typing
  const error = useMemo(() => {
    if (!touched.inputAmount || !errors.inputAmount) return null
    if (values.inputAmount === '') return null // Don't show error for empty field
    return errors.inputAmount
  }, [touched.inputAmount, errors.inputAmount, values.inputAmount])

  useEffect(() => {
    if (onTransactionDataChange) {
      const isValid = numericInputAmount > 0 && !errors.inputAmount
      // Only report errors that should be shown to the user (not empty field errors)
      const errorToReport = error // This already filters out empty field errors

      onTransactionDataChange({
        inputAmount: numericInputAmount,
        outputAmount: numericOutputAmount,
        isValid,
        error: errorToReport
      })
    }
  }, [
    numericInputAmount,
    numericOutputAmount,
    errors.inputAmount,
    error, // Use the filtered error
    isExchangeRateLoading,
    onTransactionDataChange
  ])

  // Handle input changes
  const handleInputAmountChange = useCallback(
    (value: string) => {
      // Allow only valid number input with better decimal handling
      if (value === '' || /^(\d*\.?\d*|\d+\.)$/.test(value)) {
        setFieldValue('inputAmount', value, true)
        setFieldTouched('inputAmount', true, false)
        // Call the persistence callback
        onInputValueChange?.(value)
      }
    },
    [setFieldValue, setFieldTouched, onInputValueChange]
  )

  // Handle max button click
  const handleMaxClick = useCallback(() => {
    const balance = getInputBalance()
    if (balance !== undefined) {
      const finalAmount = Math.min(balance, max)
      const finalAmountString = finalAmount.toString()
      setFieldValue('inputAmount', finalAmountString, true)
      setFieldTouched('inputAmount', true, false)
      // Call the persistence callback
      onInputValueChange?.(finalAmountString)
    }
  }, [getInputBalance, max, setFieldValue, setFieldTouched, onInputValueChange])

  return {
    inputAmount: values.inputAmount, // Raw string input for display
    numericInputAmount,
    outputAmount: values.outputAmount,
    numericOutputAmount,
    error,
    exchangeRateError,
    isExchangeRateLoading,
    isBalanceLoading,
    availableBalance,
    currentExchangeRate,
    handleInputAmountChange,
    handleMaxClick,
    formik,
    inputToken,
    outputToken,
    calculatedLimits: { min, max } // Expose the calculated limits
  }
}
