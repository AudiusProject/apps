/**
 * Hook for managing swap form validation logic
 * Provides real-time validation with contextual error messages
 */

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

/**
 * Hook that manages validation logic for swap forms
 * Provides real-time validation with appropriate error timing
 */
export const useSwapValidation = ({
  inputAmount,
  balance,
  limits,
  tokenSymbol,
  tokenDecimals,
  isBalanceLoading,
  isTouched
}: UseSwapValidationProps): SwapValidationHookResult => {
  // Create validation input object
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

  // Run validation
  const validationError = useMemo(() => {
    return validateInputAmount(validationInput)
  }, [validationInput])

  // Determine if error should be shown
  const shouldDisplayError = useMemo(() => {
    return shouldShowError(validationError, isTouched, inputAmount)
  }, [validationError, isTouched, inputAmount])

  // Check for insufficient balance (shown separately from validation errors)
  const isInsufficientBalance = useMemo(() => {
    return checkInsufficientBalance(inputAmount, balance, isBalanceLoading)
  }, [inputAmount, balance, isBalanceLoading])

  // Determine overall validity
  const isValid = useMemo(() => {
    return (
      !validationError &&
      inputAmount !== '' &&
      inputAmount !== '0' &&
      !isInsufficientBalance
    )
  }, [validationError, inputAmount, isInsufficientBalance])

  // Final error to display (only if should be shown)
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
