/**
 * Validation helper functions for token swap forms
 */

import { FixedDecimal } from '@audius/fixed-decimal'

import { buySellMessages as messages } from '../../../../messages'
import type {
  ValidationInput,
  ValidationResult,
  TokenLimits
} from '../types/swap.types'

import { isValidNumericInput, parseNumericAmount } from './tokenCalculations'

/**
 * Validates if a string represents a valid decimal number
 * Uses FixedDecimal for precise validation
 */
export const isValidDecimalString = (
  value: string,
  decimals: number
): boolean => {
  if (value === '') return true
  try {
    // eslint-disable-next-line no-new
    new FixedDecimal(value, decimals)
    return true
  } catch {
    return false
  }
}

/**
 * Validates if an amount is not empty
 */
export const validateNotEmpty = (value: string): string | null => {
  if (value === '' || value.trim() === '') {
    return messages.emptyAmount
  }
  return null
}

/**
 * Validates if an amount meets minimum requirement
 */
export const validateMinimumAmount = (
  value: string,
  min: number,
  tokenSymbol: string,
  decimals: number
): string | null => {
  if (value === '') return null

  try {
    const amount = new FixedDecimal(value, decimals)
    // The UI displays this value up to 2 decimal places. To prevent confusion we round this number up
    const minAmount = new FixedDecimal(min, decimals).round(2)

    if (amount.value < minAmount.value) {
      return messages.minAmount(min, tokenSymbol)
    }
  } catch {
    return 'Invalid amount format'
  }

  return null
}

/**
 * Validates if an amount does not exceed maximum
 */
export const validateMaximumAmount = (
  value: string,
  max: number,
  tokenSymbol: string,
  decimals: number
): string | null => {
  if (value === '') return null

  try {
    const amount = new FixedDecimal(value, decimals)
    const maxAmount = new FixedDecimal(max, decimals)

    if (amount.value > maxAmount.value) {
      return messages.maxAmount(max, tokenSymbol)
    }
  } catch {
    return 'Invalid amount format'
  }

  return null
}

/**
 * Validates if an amount does not exceed available balance
 */
export const validateSufficientBalance = (
  value: string,
  balance: number,
  tokenSymbol: string,
  decimals: number,
  isBalanceLoading: boolean
): string | null => {
  if (value === '') return null
  if (isBalanceLoading) return null

  // Treat only null/undefined as "unknown balance"; do not bypass check for numeric 0
  if (balance == null || balance === undefined) return null

  try {
    const amount = new FixedDecimal(value, decimals)
    const balanceAmount = new FixedDecimal(balance, decimals)

    if (amount.value > balanceAmount.value) {
      return messages.insufficientBalance(tokenSymbol)
    }
  } catch {
    return 'Invalid amount format'
  }

  return null
}

/**
 * Validates numeric input format (allows typing decimals)
 */
export const validateNumericInput = (value: string): string | null => {
  if (!isValidNumericInput(value)) {
    return 'Please enter a valid number'
  }
  return null
}

/**
 * Validates decimal precision
 */
export const validateDecimalPrecision = (
  value: string,
  decimals: number
): string | null => {
  if (value === '') return null

  if (!isValidDecimalString(value, decimals)) {
    return `Invalid decimal precision (max ${decimals} decimal places)`
  }

  return null
}

/**
 * Comprehensive validation for input amount
 * Returns the first error encountered or null if valid
 */
export const validateInputAmount = (input: ValidationInput): string | null => {
  const {
    inputAmount,
    balance,
    limits,
    tokenSymbol,
    tokenDecimals,
    isBalanceLoading
  } = input

  // Check for empty amount (only when the field should be validated)
  const emptyError = validateNotEmpty(inputAmount)
  if (emptyError && inputAmount.trim() === '') return emptyError

  // Skip other validations if empty (allows typing)
  if (inputAmount === '') return null

  // Validate numeric format
  const numericError = validateNumericInput(inputAmount)
  if (numericError) return numericError

  // Validate decimal precision
  const precisionError = validateDecimalPrecision(inputAmount, tokenDecimals)
  if (precisionError) return precisionError

  // Validate minimum amount
  const minError = validateMinimumAmount(
    inputAmount,
    limits.min,
    tokenSymbol,
    tokenDecimals
  )
  if (minError) return minError

  // Validate maximum amount
  const maxError = validateMaximumAmount(
    inputAmount,
    limits.max,
    tokenSymbol,
    tokenDecimals
  )
  if (maxError) return maxError

  // Validate sufficient balance
  const balanceError = validateSufficientBalance(
    inputAmount,
    balance,
    tokenSymbol,
    tokenDecimals,
    isBalanceLoading
  )
  if (balanceError) return balanceError

  return null
}

/**
 * Determines if insufficient balance error should be shown separately
 */
export const checkInsufficientBalance = (
  inputAmount: string,
  balance: number,
  isBalanceLoading: boolean
): boolean => {
  if (isBalanceLoading) return false
  if (inputAmount === '') return false

  const numericAmount = parseNumericAmount(inputAmount)
  return numericAmount > balance
}

/**
 * Validates if an amount is within reasonable limits for display
 */
export const validateDisplayAmount = (amount: number): boolean => {
  return (
    amount >= 0 && amount < Number.MAX_SAFE_INTEGER && Number.isFinite(amount)
  )
}

/**
 * Creates validation result object
 */
export const createValidationResult = (
  inputAmount: string,
  balance: number,
  limits: TokenLimits,
  tokenSymbol: string,
  tokenDecimals: number,
  isBalanceLoading: boolean,
  isTouched: boolean = false
): ValidationResult => {
  const error = isTouched
    ? validateInputAmount({
        inputAmount,
        balance,
        limits,
        tokenSymbol,
        tokenDecimals,
        isBalanceLoading
      })
    : null

  return {
    isValid:
      !error && inputAmount !== '' && parseNumericAmount(inputAmount) > 0,
    errors: error ? { inputAmount: error } : {},
    warnings: {},
    touched: { inputAmount: isTouched }
  }
}

/**
 * Determines if a field should show its error
 * Prevents showing "Required" error when field is empty during typing
 */
export const shouldShowError = (
  error: string | null,
  isTouched: boolean,
  value: string
): boolean => {
  if (!isTouched || !error) return false
  if (value === '' && error === messages.emptyAmount) return false
  return true
}
