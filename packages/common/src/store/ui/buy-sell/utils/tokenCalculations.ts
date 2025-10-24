/**
 * Pure calculation functions for token swap operations
 * All functions are deterministic and have no side effects
 */

import type {
  CalculationInput,
  CalculationResult,
  ExchangeRateData
} from '../types/swap.types'

// Maximum safe amount for API calls to prevent errors
const MAX_SAFE_EXCHANGE_RATE_AMOUNT = 1000000000000

/**
 * Returns a safe numeric value for exchange rate API calls
 * Prevents API errors by capping amounts at a reasonable maximum
 */
export const getSafeAmountForExchangeRate = (amount: number): number => {
  return Math.min(amount, MAX_SAFE_EXCHANGE_RATE_AMOUNT)
}

/**
 * Calculates output amount given input amount and exchange rate
 * Formula: Input × Rate = Output
 */
export const calculateOutputAmount = (
  inputAmount: number,
  exchangeRate: number
): number => {
  if (inputAmount <= 0 || exchangeRate <= 0) return 0
  return inputAmount * exchangeRate
}

/**
 * Calculates input amount given output amount and exchange rate
 * Formula: Output ÷ Rate = Input
 */
export const calculateInputAmount = (
  outputAmount: number,
  exchangeRate: number
): number => {
  if (outputAmount <= 0 || exchangeRate <= 0) return 0
  return outputAmount / exchangeRate
}

/**
 * Calculates exchange rate given input and output amounts
 * Formula: Output ÷ Input = Rate
 */
export const calculateExchangeRate = (
  inputAmount: number,
  outputAmount: number
): number => {
  if (inputAmount <= 0 || outputAmount <= 0) return 0
  return outputAmount / inputAmount
}

/**
 * Formats a token amount with proper decimal places
 * Removes trailing zeros and handles edge cases
 */
export const formatTokenAmount = (
  amount: number,
  decimals: number = 6
): string => {
  if (amount === 0) return '0'
  if (isNaN(amount) || !isFinite(amount)) return '0'

  // For very small amounts, use scientific notation or fixed decimal places
  if (amount < Math.pow(10, -decimals)) {
    return amount.toExponential(2)
  }

  // Format with appropriate decimal places and remove trailing zeros
  return parseFloat(amount.toFixed(decimals)).toString()
}

/**
 * Validates if a string is a valid numeric input
 * Allows empty strings, integers, decimals, and partial decimal inputs
 */
export const isValidNumericInput = (value: string): boolean => {
  if (value === '') return true
  // Allow numbers with optional decimal point and digits
  return /^(\d*\.?\d*|\d+\.)$/.test(value)
}

/**
 * Safely parses a string to number, returning 0 for invalid inputs
 * Note: This function uses parseFloat for backward compatibility with places
 * that don't have access to token decimals. For decimal-aware parsing,
 * use FixedDecimal directly.
 */
export const parseNumericAmount = (value: string): number => {
  if (!value || value === '') return 0
  const parsed = parseFloat(value)
  return isNaN(parsed) ? 0 : parsed
}

/**
 * Performs bidirectional calculation based on source and exchange rate
 * This is the core calculation logic that maintains mathematical consistency
 */
export const performBidirectionalCalculation = (
  input: CalculationInput
): CalculationResult => {
  const { amount, source, exchangeRate } = input

  if (!exchangeRate || exchangeRate <= 0) {
    return {
      inputAmount: source === 'input' ? amount : 0,
      outputAmount: source === 'output' ? amount : 0,
      source,
      isValid: false
    }
  }

  if (source === 'input') {
    const outputAmount = calculateOutputAmount(amount, exchangeRate)
    return {
      inputAmount: amount,
      outputAmount,
      source: 'input',
      isValid: amount > 0
    }
  } else if (source === 'output') {
    const inputAmount = calculateInputAmount(amount, exchangeRate)
    return {
      inputAmount,
      outputAmount: amount,
      source: 'output',
      isValid: amount > 0
    }
  }

  // No source specified - return empty state
  return {
    inputAmount: 0,
    outputAmount: 0,
    source: null,
    isValid: false
  }
}

/**
 * Derives display exchange rate from exchange rate data
 * Calculates rate per 1 unit for display purposes
 */
export const deriveDisplayExchangeRate = (
  exchangeRateData: ExchangeRateData | null
): number | null => {
  if (!exchangeRateData) return null

  const { rate, inputAmount } = exchangeRateData
  const divisor = inputAmount?.uiAmount || 1

  if (divisor === 0) return null
  return rate / divisor
}

/**
 * Determines if two numeric values are effectively equal
 * Accounts for floating point precision issues
 */
export const isEffectivelyEqual = (
  a: number,
  b: number,
  tolerance: number = 1e-10
): boolean => {
  return Math.abs(a - b) < tolerance
}

/**
 * Clamps a number between min and max values
 */
export const clampNumber = (
  value: number,
  min: number,
  max: number
): number => {
  return Math.min(Math.max(value, min), max)
}

/**
 * Rounds a number to a specified number of decimal places
 * Handles floating point precision issues
 */
export const roundToDecimals = (value: number, decimals: number): number => {
  const factor = Math.pow(10, decimals)
  return Math.round(value * factor) / factor
}
