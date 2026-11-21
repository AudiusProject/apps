import { getTokenDecimalPlaces } from './decimal'

export const parseIntList = (str: string) => {
  return str.split(',').map((s) => Number.parseInt(s))
}

export const attemptStringToNumber = (value?: string | null) => {
  if (value == null) return null
  const parsed = Number.parseInt(value, 10)
  return Number.isNaN(parsed) ? null : parsed
}

export const sanitizeNumericInput = (input: string): string => {
  const cleaned = input.replace(/[^0-9.]/g, '')

  const parts = cleaned.split('.')
  if (parts.length > 2) {
    return parts[0] + '.' + parts.slice(1).join('')
  }

  return cleaned
}

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
