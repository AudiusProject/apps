import { getTokenDecimalPlaces } from './decimal'

/** Takes a list of comma-separated strings, splits and parses them into numbers */
export const parseIntList = (str: string) => {
  return str.split(',').map((s) => Number.parseInt(s))
}

/** Attempts to parse a potentially empty string to a base 10 number. Returns `null` on failure. */
export const attemptStringToNumber = (value?: string | null) => {
  if (value == null) return null
  const parsed = Number.parseInt(value, 10)
  return Number.isNaN(parsed) ? null : parsed
}

/**
 * Sanitizes numeric input by removing non-numeric characters except decimal points
 * and handling multiple decimal points by keeping only the first one
 */
export const sanitizeNumericInput = (input: string): string => {
  // Remove any non-numeric characters except decimal point
  const cleaned = input.replace(/[^0-9.]/g, '')

  // Handle multiple decimal points - keep only the first one
  const parts = cleaned.split('.')
  if (parts.length > 2) {
    return parts[0] + '.' + parts.slice(1).join('')
  }

  return cleaned
}

/**
 * Formats a numeric input string with smart decimal precision based on value magnitude
 */
export const formatTokenInputWithSmartDecimals = (value: string): string => {
  if (!value || value === '' || value === '.') {
    return value
  }

  try {
    const numericValue = parseFloat(value)
    if (isNaN(numericValue) || numericValue <= 0) {
      return value
    }

    const maxDecimals = getTokenDecimalPlaces(numericValue)

    const parts = value.split('.')

    if (parts.length === 2 && parts[1].length > maxDecimals) {
      return `${parts[0]}.${parts[1].substring(0, maxDecimals)}`
    }

    return value
  } catch {
    return value
  }
}
