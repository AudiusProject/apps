import { useMemo } from 'react'

import type {
  TokenLimits,
  SwapValidationHookResult,
  ValidationInput
} from '../types/swap.types'
import {
  validateInputAmount,
  checkInsufficientBalance,
  shouldShowError
} from '../utils/validationHelpers'

export type UseSwapValidationProps = {
  inputAmount: string
  balance: number
  limits: TokenLimits
  tokenSymbol: string
  tokenDecimals: number
  isBalanceLoading: boolean
  isTouched: boolean
}

export const useSwapValidation = ({
  inputAmount,
  balance,
  limits,
  tokenSymbol,
  tokenDecimals,
  isBalanceLoading,
  isTouched
}: UseSwapValidationProps): SwapValidationHookResult => {
  const validationInput: ValidationInput = useMemo(
    () => ({
      inputAmount,
      balance,
      limits,
      tokenSymbol,
      tokenDecimals,
      isBalanceLoading
    }),
    [inputAmount, balance, limits, tokenSymbol, tokenDecimals, isBalanceLoading]
  )

  const validationError = useMemo(() => {
    return validateInputAmount(validationInput)
  }, [validationInput])

  const shouldDisplayError = useMemo(() => {
    return shouldShowError(validationError, isTouched, inputAmount)
  }, [validationError, isTouched, inputAmount])

  const isInsufficientBalance = useMemo(() => {
    return checkInsufficientBalance(inputAmount, balance, isBalanceLoading)
  }, [inputAmount, balance, isBalanceLoading])

  const isValid = useMemo(() => {
    return (
      !validationError &&
      inputAmount !== '' &&
      inputAmount !== '0' &&
      !isInsufficientBalance
    )
  }, [validationError, inputAmount, isInsufficientBalance])

  const displayError = shouldDisplayError ? validationError : null

  return {
    error: displayError,
    isValid,
    isInsufficientBalance,
    validateField: () => {
      // This is handled by the parent component's form validation
      // Kept for interface compatibility
    },
    resetValidation: () => {
      // Validation state is derived, so no explicit reset needed
      // Kept for interface compatibility
    }
  }
}
