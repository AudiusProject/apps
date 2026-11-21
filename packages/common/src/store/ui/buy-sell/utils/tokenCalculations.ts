import type {
  CalculationInput,
  CalculationResult,
  ExchangeRateData
} from '../types/swap.types'

const MAX_SAFE_EXCHANGE_RATE_AMOUNT = 1000000000000

export const getSafeAmountForExchangeRate = (amount: number): number => {
  return Math.min(amount, MAX_SAFE_EXCHANGE_RATE_AMOUNT)
}

export const calculateOutputAmount = (
  inputAmount: number,
  exchangeRate: number
): number => {
  if (inputAmount <= 0 || exchangeRate <= 0) return 0
  return inputAmount * exchangeRate
}

export const calculateInputAmount = (
  outputAmount: number,
  exchangeRate: number
): number => {
  if (outputAmount <= 0 || exchangeRate <= 0) return 0
  return outputAmount / exchangeRate
}

export const calculateExchangeRate = (
  inputAmount: number,
  outputAmount: number
): number => {
  if (inputAmount <= 0 || outputAmount <= 0) return 0
  return outputAmount / inputAmount
}

export const formatTokenAmount = (
  amount: number,
  decimals: number = 6
): string => {
  if (amount === 0) return '0'
  if (isNaN(amount) || !isFinite(amount)) return '0'

  if (amount < Math.pow(10, -decimals)) {
    return amount.toExponential(2)
  }

  return parseFloat(amount.toFixed(decimals)).toString()
}

export const isValidNumericInput = (value: string): boolean => {
  if (value === '') return true
  return /^(\d*\.?\d*|\d+\.)$/.test(value)
}

export const parseNumericAmount = (value: string): number => {
  if (!value || value === '') return 0
  const parsed = parseFloat(value)
  return isNaN(parsed) ? 0 : parsed
}

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

  return {
    inputAmount: 0,
    outputAmount: 0,
    source: null,
    isValid: false
  }
}

export const deriveDisplayExchangeRate = (
  exchangeRateData: ExchangeRateData | null
): number | null => {
  if (!exchangeRateData) return null

  const { rate, inputAmount } = exchangeRateData
  const divisor = inputAmount?.uiAmount || 1

  if (divisor === 0) return null
  return rate / divisor
}

export const isEffectivelyEqual = (
  a: number,
  b: number,
  tolerance: number = 1e-10
): boolean => {
  return Math.abs(a - b) < tolerance
}

export const clampNumber = (
  value: number,
  min: number,
  max: number
): number => {
  return Math.min(Math.max(value, min), max)
}

export const roundToDecimals = (value: number, decimals: number): number => {
  const factor = Math.pow(10, decimals)
  return Math.round(value * factor) / factor
}
