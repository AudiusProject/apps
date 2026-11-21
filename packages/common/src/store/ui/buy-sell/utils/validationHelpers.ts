import { FixedDecimal } from '@audius/fixed-decimal'

import { buySellMessages as messages } from '../../../../messages'
import type {
  ValidationInput,
  ValidationResult,
  TokenLimits
} from '../types/swap.types'

import { isValidNumericInput, parseNumericAmount } from './tokenCalculations'

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

export const validateNotEmpty = (value: string): string | null => {
  if (value === '' || value.trim() === '') {
    return messages.emptyAmount
  }
  return null
}

export const validateMinimumAmount = (
  value: string,
  min: number,
  tokenSymbol: string,
  decimals: number
): string | null => {
  if (value === '') return null

  try {
    const amount = new FixedDecimal(value, decimals)
    const minAmount = new FixedDecimal(min, decimals).round(2)

    if (amount.value < minAmount.value) {
      return messages.minAmount(min, tokenSymbol)
    }
  } catch {
    return 'Invalid amount format'
  }

  return null
}

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

export const validateSufficientBalance = (
  value: string,
  balance: number,
  tokenSymbol: string,
  decimals: number,
  isBalanceLoading: boolean
): string | null => {
  if (value === '') return null
  if (isBalanceLoading) return null

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

export const validateNumericInput = (value: string): string | null => {
  if (!isValidNumericInput(value)) {
    return 'Please enter a valid number'
  }
  return null
}

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

export const validateInputAmount = (input: ValidationInput): string | null => {
  const {
    inputAmount,
    balance,
    limits,
    tokenSymbol,
    tokenDecimals,
    isBalanceLoading
  } = input

  const emptyError = validateNotEmpty(inputAmount)
  if (emptyError && inputAmount.trim() === '') return emptyError

  if (inputAmount === '') return null

  const numericError = validateNumericInput(inputAmount)
  if (numericError) return numericError

  const precisionError = validateDecimalPrecision(inputAmount, tokenDecimals)
  if (precisionError) return precisionError

  const minError = validateMinimumAmount(
    inputAmount,
    limits.min,
    tokenSymbol,
    tokenDecimals
  )
  if (minError) return minError

  const maxError = validateMaximumAmount(
    inputAmount,
    limits.max,
    tokenSymbol,
    tokenDecimals
  )
  if (maxError) return maxError

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

export const validateDisplayAmount = (amount: number): boolean => {
  return (
    amount >= 0 && amount < Number.MAX_SAFE_INTEGER && Number.isFinite(amount)
  )
}

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

export const shouldShowError = (
  error: string | null,
  isTouched: boolean,
  value: string
): boolean => {
  if (!isTouched || !error) return false
  if (value === '' && error === messages.emptyAmount) return false
  return true
}
