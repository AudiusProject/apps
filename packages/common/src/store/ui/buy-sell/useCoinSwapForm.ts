import { useCallback, useEffect, useMemo, useRef } from 'react'

import { useFormik } from 'formik'
import { toFormikValidationSchema } from 'zod-formik-adapter'

import { useFanClub } from '~/api'

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
  inputCoin: CoinInfo
  outputCoin: CoinInfo
  min?: number
  max?: number
  requiredRemainingBalance?: number
  onTransactionDataChange?: (data: {
    inputAmount: number
    outputAmount: number
    isValid: boolean
    error: string | null
    isInsufficientBalance: boolean
    exchangeRate?: number | null
    exchangeRateError?: Error | null
  }) => void
  initialInputValue?: string
  onInputValueChange?: (value: string) => void
  externalWalletAddress?: string
}

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
  const { data: tokenPriceData } = useFanClub(inputCoin.address)
  const tokenPrice = tokenPriceData?.price ? Number(tokenPriceData.price) : null

  const calculatedLimits = useMemo(() => {
    return resolveTokenLimits({
      tokenPrice,
      isStablecoin: inputCoin.isStablecoin || false,
      providedMin,
      providedMax,
      tokenAddress: inputCoin.address
    })
  }, [
    tokenPrice,
    inputCoin.isStablecoin,
    providedMin,
    providedMax,
    inputCoin.address
  ])

  const { min, max } = calculatedLimits

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
    isTouched: true
  })

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

  const lastSyncedInputRef = useRef<string>('')
  const lastSyncedOutputRef = useRef<string>('')

  useEffect(() => {
    if (initialInputValue !== lastSyncedInputRef.current) {
      setFieldValue('inputAmount', initialInputValue, false)
      lastSyncedInputRef.current = initialInputValue
    }
  }, [initialInputValue, setFieldValue])

  const lastValidationKeyRef = useRef<string | null>(null)
  const tokenValidationKey = `${inputCoin.address}-${outputCoin.address}`
  useEffect(() => {
    if (!values.inputAmount || values.inputAmount === '') return
    if (lastValidationKeyRef.current !== tokenValidationKey) {
      lastValidationKeyRef.current = tokenValidationKey
      setFieldTouched('inputAmount', true, true)
      formik.validateForm()
    }
  }, [tokenValidationKey, values.inputAmount, setFieldTouched, formik])

  const numericInputAmount = swapCalculations.numericInputAmount
  const numericOutputAmount = swapCalculations.numericOutputAmount
  const currentExchangeRate = tokenData.exchangeRate
  const displayExchangeRate = tokenData.displayExchangeRate
  const isExchangeRateLoading = tokenData.isExchangeRateLoading
  const exchangeRateError = tokenData.exchangeRateError
  const isBalanceLoading = tokenData.isBalanceLoading

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

  const error = swapValidation.error
  useEffect(() => {
    if (error) {
      setFieldError('inputAmount', error)
    }
    if (!error) {
      setFieldError('inputAmount', undefined)
    }
  }, [error, formikErrors.inputAmount, setFieldError])
  const isInsufficientBalance = swapValidation.isInsufficientBalance

  const transactionData = useMemo(
    () => ({
      inputAmount: numericInputAmount,
      outputAmount: numericOutputAmount,
      isValid: swapValidation.isValid,
      error,
      isInsufficientBalance,
      exchangeRate: currentExchangeRate,
      exchangeRateError,
      isExchangeRateLoading
    }),
    [
      numericInputAmount,
      numericOutputAmount,
      swapValidation.isValid,
      error,
      isInsufficientBalance,
      currentExchangeRate,
      exchangeRateError,
      isExchangeRateLoading
    ]
  )

  useEffect(() => {
    onTransactionDataChange?.(transactionData)
  }, [transactionData, onTransactionDataChange])

  const handleInputAmountChange = useCallback(
    (value: string) => {
      swapCalculations.handleInputChange(value)
      setFieldTouched('inputAmount', true, false)
    },
    [swapCalculations, setFieldTouched]
  )

  const handleOutputAmountChange = useCallback(
    (value: string) => {
      swapCalculations.handleOutputChange(value)
    },
    [swapCalculations]
  )

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
    calculatedLimits
  }
}
