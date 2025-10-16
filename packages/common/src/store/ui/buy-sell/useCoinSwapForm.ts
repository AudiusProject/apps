import { useCallback, useEffect, useMemo, useRef } from 'react'

import { useFormik } from 'formik'
import { toFormikValidationSchema } from 'zod-formik-adapter'

import { useArtistCoin } from '~/api'

import { useCoinData } from './hooks/useCoinData'
import { useSwapCalculations } from './hooks/useSwapCalculations'
import { useSwapValidation } from './hooks/useSwapValidation'
import { createSwapFormSchema, type SwapFormValues } from './swapFormSchema'
import type { CoinInfo } from './types/swap.types'
import { parseNumericAmount } from './utils/tokenCalculations'
import { resolveTokenLimits } from './utils/tokenLimits'

export type BalanceConfig = {
  get: () => number | undefined
  loading: boolean
  formatError: (amount: number) => string
}

export type CoinSwapFormProps = {
  /**
   * The token the user is paying with (input)
   */
  inputCoin: CoinInfo
  /**
   * The token the user is receiving (output)
   */
  outputCoin: CoinInfo
  /**
   * Minimum amount allowed for input (optional - will be calculated from USD limits if not provided)
   */
  min?: number
  /**
   * Maximum amount allowed for input (optional - will be calculated from USD limits if not provided)
   */
  max?: number
  /**
   * The minimum remaining balance required for the input token
   */
  requiredRemainingBalance?: number
  /**
   * Callback for when transaction data changes
   */
  onTransactionDataChange?: (data: {
    inputAmount: number
    outputAmount: number
    isValid: boolean
    error: string | null
    isInsufficientBalance: boolean
    exchangeRate?: number | null
  }) => void
  /**
   * Initial value for the input field
   */
  initialInputValue?: string
  /**
   * Callback for when input value changes (for persistence)
   */
  onInputValueChange?: (value: string) => void
  /**
   * Optional - specify a specific externalwallet address to use as the source of balance
   */
  externalWalletAddress?: string
}

/**
 * A hook to manage the common functionality for token swaps
 */
export const useCoinSwapForm = ({
  inputCoin,
  outputCoin,
  min: providedMin,
  max: providedMax,
  requiredRemainingBalance: providedRequiredRemainingBalance,
  onTransactionDataChange,
  initialInputValue = '',
  onInputValueChange,
  externalWalletAddress
}: CoinSwapFormProps) => {
  // Get token price for USD-based limit calculations
  const { data: tokenPriceData } = useArtistCoin(inputCoin.address)
  const tokenPrice = tokenPriceData?.price ? Number(tokenPriceData.price) : null

  // Calculate min/max based on USD limits and current price
  const calculatedLimits = useMemo(() => {
    return resolveTokenLimits({
      tokenPrice,
      isStablecoin: inputCoin.isStablecoin || false,
      providedMin,
      providedMax
    })
  }, [tokenPrice, inputCoin.isStablecoin, providedMin, providedMax])

  const { min, max } = calculatedLimits

  // Use new composed hooks
  const tokenData = useCoinData({
    inputCoin,
    outputCoin,
    inputAmount: parseNumericAmount(initialInputValue),
    externalWalletAddress,
    queryOptions: {
      refetchInterval: 5000
    }
  })

  const swapCalculations = useSwapCalculations({
    exchangeRate: tokenData.exchangeRate,
    onInputValueChange,
    inputCoinAddress: inputCoin.address,
    outputCoinAddress: outputCoin.address,
    inputCoinDecimals: inputCoin.decimals,
    outputCoinDecimals: outputCoin.decimals
  })

  const availableBalance = tokenData.balance
  const adjustedMax = providedRequiredRemainingBalance
    ? tokenData.fullBalance - (providedRequiredRemainingBalance ?? 0)
    : max
  const swapValidation = useSwapValidation({
    inputAmount: swapCalculations.inputAmount,
    balance: tokenData.fullBalance,
    limits: { min, max: adjustedMax },
    tokenSymbol: inputCoin.symbol,
    tokenDecimals: inputCoin.decimals,
    isBalanceLoading: tokenData.isBalanceLoading,
    isTouched: true // Simplified - in real implementation would track this properly
  })

  // Create validation schema - use full balance for validation
  const validationSchema = useMemo(() => {
    return toFormikValidationSchema(
      createSwapFormSchema(
        min,
        adjustedMax,
        tokenData.fullBalance,
        inputCoin.symbol,
        inputCoin.decimals
      )
    )
  }, [
    min,
    adjustedMax,
    tokenData.fullBalance,
    inputCoin.symbol,
    inputCoin.decimals
  ])

  // Initialize form with Formik
  const formik = useFormik<SwapFormValues>({
    initialValues: {
      inputAmount: initialInputValue,
      outputAmount: '0',
      selectedInputToken: inputCoin,
      selectedOutputToken: outputCoin
    },
    validationSchema,
    validateOnBlur: true,
    validateOnChange: true,
    onSubmit: () => {
      // The form is never actually submitted - we just use Formik for validation
      // and state management
    }
  })

  const {
    values,
    errors: formikErrors,
    setFieldValue,
    setFieldTouched,
    setFieldError
  } = formik

  // Refs to track last synced values to avoid circular dependencies
  const lastSyncedInputRef = useRef<string>('')
  const lastSyncedOutputRef = useRef<string>('')

  // Update form value when initialInputValue changes (tab switch)
  useEffect(() => {
    if (initialInputValue !== lastSyncedInputRef.current) {
      setFieldValue('inputAmount', initialInputValue, false)
      lastSyncedInputRef.current = initialInputValue
    }
  }, [initialInputValue, setFieldValue])

  // Re-validate input when token or balance changes. Guard to avoid infinite loops.
  const lastValidationKeyRef = useRef<string | null>(null)
  // Only re-validate on actual token change to avoid recursive updates during balance polling
  const tokenValidationKey = `${inputCoin.address}-${outputCoin.address}`
  useEffect(() => {
    if (!values.inputAmount || values.inputAmount === '') return
    if (lastValidationKeyRef.current !== tokenValidationKey) {
      lastValidationKeyRef.current = tokenValidationKey
      setFieldTouched('inputAmount', true, true)
      // Explicitly validate to refresh errors for the new token
      formik.validateForm()
    }
  }, [tokenValidationKey, values.inputAmount, setFieldTouched, formik])

  // Extract values from composed hooks
  const numericInputAmount = swapCalculations.numericInputAmount
  const numericOutputAmount = swapCalculations.numericOutputAmount
  const currentExchangeRate = tokenData.exchangeRate
  const displayExchangeRate = tokenData.displayExchangeRate
  const isExchangeRateLoading = tokenData.isExchangeRateLoading
  const exchangeRateError = tokenData.exchangeRateError
  const isBalanceLoading = tokenData.isBalanceLoading

  // Sync Formik values with our calculation hook
  // Use refs to avoid circular dependencies while still syncing when needed
  useEffect(() => {
    if (swapCalculations.inputAmount !== lastSyncedInputRef.current) {
      setFieldValue('inputAmount', swapCalculations.inputAmount, false)
      lastSyncedInputRef.current = swapCalculations.inputAmount
    }
  }, [swapCalculations.inputAmount, setFieldValue])

  useEffect(() => {
    if (swapCalculations.outputAmount !== lastSyncedOutputRef.current) {
      setFieldValue('outputAmount', swapCalculations.outputAmount, false)
      lastSyncedOutputRef.current = swapCalculations.outputAmount
    }
  }, [swapCalculations.outputAmount, setFieldValue])

  // Use validation from our composed hook
  const error = swapValidation.error
  useEffect(() => {
    if (error) {
      setFieldError('inputAmount', error)
    }
    // Clear error
    if (!error) {
      setFieldError('inputAmount', undefined)
    }
  }, [error, formikErrors.inputAmount, setFieldError])
  const isInsufficientBalance = swapValidation.isInsufficientBalance

  // Memoize the transaction data to prevent excessive callbacks
  const transactionData = useMemo(
    () => ({
      inputAmount: numericInputAmount,
      outputAmount: numericOutputAmount,
      isValid: swapValidation.isValid,
      error,
      isInsufficientBalance,
      exchangeRate: currentExchangeRate,
      isExchangeRateLoading
    }),
    [
      numericInputAmount,
      numericOutputAmount,
      swapValidation.isValid,
      error,
      isInsufficientBalance,
      currentExchangeRate,
      isExchangeRateLoading
    ]
  )

  useEffect(() => {
    onTransactionDataChange?.(transactionData)
  }, [transactionData, onTransactionDataChange])

  // Handle input changes through our calculation hook
  const handleInputAmountChange = useCallback(
    (value: string) => {
      swapCalculations.handleInputChange(value)
      setFieldTouched('inputAmount', true, false)
    },
    [swapCalculations, setFieldTouched]
  )

  // Handle output amount changes through our calculation hook
  const handleOutputAmountChange = useCallback(
    (value: string) => {
      swapCalculations.handleOutputChange(value)
    },
    [swapCalculations]
  )

  // Handle max button click - use full untruncated balance for swaps
  const handleMaxClick = useCallback(() => {
    const fullBalance =
      tokenData.fullBalance - (providedRequiredRemainingBalance ?? 0)
    if (fullBalance !== undefined) {
      const finalAmountString = fullBalance.toString()
      swapCalculations.handleInputChange(finalAmountString)
      setFieldTouched('inputAmount', true, false)
    }
  }, [
    tokenData.fullBalance,
    swapCalculations,
    setFieldTouched,
    providedRequiredRemainingBalance
  ])

  return {
    inputAmount: swapCalculations.inputAmount, // Raw string input for display
    numericInputAmount,
    outputAmount: swapCalculations.outputAmount,
    numericOutputAmount,
    error,
    exchangeRateError,
    isExchangeRateLoading,
    isBalanceLoading,
    availableBalance,
    currentExchangeRate,
    displayExchangeRate,
    handleInputAmountChange,
    handleOutputAmountChange,
    handleMaxClick,
    formik,
    inputCoin,
    outputCoin,
    calculatedLimits // Expose the calculated limits
  }
}
