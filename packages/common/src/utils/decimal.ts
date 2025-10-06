import { AUDIO } from '@audius/fixed-decimal'
import numeral from 'numeral'

const PRECISION = 2

export type DecimalUtilOptions = {
  /** Number of digits used on the right side of human-readable values. Defaults to 2 */
  precision?: number
}

/**
 * Helper to parse values from text input and give numeric values and human readable values out. Removes characters that are not numbers or decimals.
 */
export const filterDecimalString = (
  value: string,
  { precision = PRECISION }: DecimalUtilOptions = {}
) => {
  const input = value.replace(/[^0-9.]+/g, '')
  // Regex to grab the whole and decimal parts of the number, stripping duplicate '.' characters
  const match = input.match(/^(\d*)(\.)?(\d*)/)
  const [, whole = '', dot = '', decimal = ''] = match || []

  // Conditionally render the decimal part, and only for the number of decimals specified
  const stringAmount = dot
    ? `${whole}.${(decimal ?? '').substring(0, precision)}`
    : whole

  // Strip leading zeros unless it's just "0" or "0."
  const cleanedAmount =
    stringAmount.replace(/^0+(?=\d)/, '') ||
    (stringAmount.includes('.')
      ? '0' + stringAmount.substring(stringAmount.indexOf('.'))
      : stringAmount)

  return { human: cleanedAmount, value: Number(stringAmount) * 10 ** precision }
}

/**
 * Helper to pad a decimal value to a specified precision, useful for blur events on a token input
 */
export const padDecimalValue = (
  value: string,
  { precision = PRECISION }: Pick<DecimalUtilOptions, 'precision'> = {}
) => {
  const [whole, decimal] = value.split('.')

  const paddedDecimal = (decimal ?? '')
    .substring(0, precision)
    .padEnd(precision, '0')
  return `${whole.length > 0 ? whole : '0'}.${paddedDecimal}`
}

/** Converts an integer value representing a decimal number to it's human-readable form. (ex. 100 => 1.00) */
export const decimalIntegerToHumanReadable = (
  value: number,
  { precision = PRECISION }: DecimalUtilOptions = {}
) => {
  return (value / 10 ** precision).toFixed(precision)
}

/** Converts a string representing a decimal number to its equivalent integer representation (ex. 1.00 => 100) */
export const decimalIntegerFromHumanReadable = (
  value: string,
  { precision = PRECISION }: DecimalUtilOptions = {}
) => {
  return parseFloat(value) * 10 ** precision
}

export const getCurrencyDecimalPlaces = (priceUSD: number) => {
  if (priceUSD >= 1) return 2
  if (priceUSD >= 0.01) return 4
  if (priceUSD >= 0.0001) return 6
  return 8
}

/**
 * Returns the number of decimal places to show for AUDIO balance formatting
 * based on the balance magnitude. Smaller balances show more decimals to remain meaningful.
 * Always shows a minimum of 2 decimal places.
 *
 * @param balance - The balance value to determine decimal places for
 * @returns Number of decimal places to show (minimum 2)
 *
 * @example
 * getTokenDecimalPlaces(1234.56)   // 2 → "1,234.56"
 * getTokenDecimalPlaces(92.0253)   // 2 → "92.02"
 * getTokenDecimalPlaces(1.2345)    // 2 → "1.23"
 * getTokenDecimalPlaces(0.1234)    // 3 → "0.123"
 * getTokenDecimalPlaces(0.00123)   // 5 → "0.00123"
 */
export const getTokenDecimalPlaces = (balance: number) => {
  const absBalance = Math.abs(balance)

  if (absBalance >= 1000) {
    return 2 // 1,234.56 (minimum 2 decimals even for large amounts)
  }
  if (absBalance >= 100) {
    return 2 // 123.45
  }
  if (absBalance >= 10) {
    return 2 // 12.34
  }
  if (absBalance >= 1) {
    return 2 // 1.23
  }
  if (absBalance >= 0.1) {
    return 3 // 0.123
  }
  if (absBalance >= 0.01) {
    return 4 // 0.0123
  }
  if (absBalance >= 0.001) {
    return 5 // 0.00123
  }

  // For very small amounts, show enough decimals to see meaningful value
  return 6
}

export const formatAudioBalance = (
  balance: bigint,
  locale: string = 'en-US'
): string => {
  const balanceNumber = Number(AUDIO(balance).toString())
  const decimalPlaces = getTokenDecimalPlaces(balanceNumber)

  return AUDIO(balance).toLocaleString(locale, {
    maximumFractionDigits: decimalPlaces,
    roundingMode: 'trunc'
  })
}

/**
 * Formats a number as currency with dynamic decimal places based on value magnitude.
 * Uses getCurrencyDecimalPlaces to determine appropriate precision.
 *
 * @param num - The number to format as currency
 * @param locale - Locale for number formatting (defaults to 'en-US')
 * @returns Formatted currency string
 *
 * @example
 * formatCurrency(123.456)  // "$123.46"
 * formatCurrency(0.0012)   // "$0.001200"
 * formatCurrency(0)        // "$0.00"
 */
export const formatCurrency = (
  num: number,
  locale: string = 'en-US'
): string => {
  if (num === 0) return '$0.00'

  try {
    const decimalPlaces = getCurrencyDecimalPlaces(num)
    const formatted = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: Math.min(decimalPlaces, 2),
      maximumFractionDigits: decimalPlaces
    }).format(num)

    return formatted
  } catch {
    return `$${num.toFixed(2)}`
  }
}

/**
 * Formats a number with subscript notation for many leading zeros after decimal.
 * For example: 0.000068352 → 0.0₄68352
 *
 * @param num - The number to format
 * @param locale - Locale for number formatting (defaults to 'en-US')
 * @returns Formatted string with subscript notation for leading zeros
 */
export const formatCurrencyWithSubscript = (
  num: number,
  locale: string = 'en-US',
  prefix: string = '$'
): string => {
  if (num === 0) return `${prefix}0.00`

  try {
    const decimalPlaces = getCurrencyDecimalPlaces(num)
    const formatted = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: Math.min(decimalPlaces, 2),
      maximumFractionDigits: decimalPlaces
    }).format(num)

    // Extract the number part (remove currency symbol and commas)
    const numberPart = formatted.replace(/[^0-9.-]/g, '').replace(/,/g, '')

    // Check if there are leading zeros after decimal that should be subscripted
    const parts = numberPart.split('.')
    if (parts.length === 2 && parts[0] === '0') {
      const decimalPart = parts[1]

      // Find consecutive zeros after the decimal
      const zeroMatch = decimalPart.match(/^0+/)
      if (zeroMatch) {
        const zeroCount = zeroMatch[0].length
        const remainingDigits = decimalPart.substring(zeroCount)

        // Only apply subscript if there are 3 or more leading zeros
        if (zeroCount >= 3 && remainingDigits.length > 0) {
          // Create subscript number (Unicode subscript digits)
          const subscriptDigits = zeroCount
            .toString()
            .split('')
            .map((digit) => {
              const subscripts = [
                '₀',
                '₁',
                '₂',
                '₃',
                '₄',
                '₅',
                '₆',
                '₇',
                '₈',
                '₉'
              ]
              return subscripts[parseInt(digit)]
            })
            .join('')

          // Format as $0.0[subscript][remaining digits]
          return `${prefix}0.0${subscriptDigits}${remainingDigits}`
        }
      }
    }

    return formatted.replace('$', prefix)
  } catch {
    return `${prefix}${num.toFixed(2)}`
  }
}

/**
 * Formats a count into a more readable string representation.
 * For counts over 1000, it converts the number into a format with a suffix (K for thousands, M for millions, etc.)
 * For example:
 * - 375 => "375"
 * - 4,210 => "4.21K"
 * - 443,123 => "443K"
 * - 4,001,000 => "4M"
 * If the count is 0, it returns "0".
 * This function is pulled over from the common package because we don't use the common package in Harmony.
 */
export const formatCount = (count: number, decimals: number = 0) => {
  if (count >= 1000) {
    const countStr = count.toString()
    let formatted: string

    if (countStr.length % 3 === 0) {
      formatted = numeral(count).format('0a').toUpperCase()
    } else if (countStr.length % 3 === 1 && countStr[2] !== '0') {
      formatted = numeral(count).format('0.00a').toUpperCase()
    } else if (countStr.length % 3 === 1 && countStr[1] !== '0') {
      formatted = numeral(count).format('0.0a').toUpperCase()
    } else if (countStr.length % 3 === 2 && countStr[2] !== '0') {
      formatted = numeral(count).format('0.0a').toUpperCase()
    } else {
      formatted = numeral(count).format('0a').toUpperCase()
    }

    // Strip .00 before letter suffixes
    return formatted.replace(/\.00([A-Z])/g, '$1')
  } else if (!count) {
    return '0'
  } else {
    return `${count.toFixed(decimals)}`
  }
}
