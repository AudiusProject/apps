import { AUDIO } from '@audius/fixed-decimal'
import numeral from 'numeral'

const PRECISION = 2

export type DecimalUtilOptions = {
  precision?: number
}

export const filterDecimalString = (
  value: string,
  { precision = PRECISION }: DecimalUtilOptions = {}
) => {
  const input = value.replace(/[^0-9.]+/g, '')
  const match = input.match(/^(\d*)(\.)?(\d*)/)
  const [, whole = '', dot = '', decimal = ''] = match || []

  const stringAmount = dot
    ? `${whole}.${(decimal ?? '').substring(0, precision)}`
    : whole

  const cleanedAmount =
    stringAmount.replace(/^0+(?=\d)/, '') ||
    (stringAmount.includes('.')
      ? '0' + stringAmount.substring(stringAmount.indexOf('.'))
      : stringAmount)

  return { human: cleanedAmount, value: Number(stringAmount) * 10 ** precision }
}

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

export const decimalIntegerToHumanReadable = (
  value: number,
  { precision = PRECISION }: DecimalUtilOptions = {}
) => {
  return (value / 10 ** precision).toFixed(precision)
}

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

export const getTokenDecimalPlaces = (balance: number) => {
  const absBalance = Math.abs(balance)

  if (absBalance >= 1000) {
    return 2
  }
  if (absBalance >= 100) {
    return 2
  }
  if (absBalance >= 10) {
    return 2
  }
  if (absBalance >= 1) {
    return 2
  }
  if (absBalance >= 0.1) {
    return 3
  }
  if (absBalance >= 0.01) {
    return 4
  }
  if (absBalance >= 0.001) {
    return 5
  }

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

export const formatCurrency = (
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

    return formatted.replace('$', prefix)
  } catch {
    return `${prefix}${num.toFixed(2)}`
  }
}

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

    const numberPart = formatted.replace(/[^0-9.-]/g, '').replace(/,/g, '')

    const parts = numberPart.split('.')
    if (parts.length === 2 && parts[0] === '0') {
      const decimalPart = parts[1]

      const zeroMatch = decimalPart.match(/^0+/)
      if (zeroMatch) {
        const zeroCount = zeroMatch[0].length
        const remainingDigits = decimalPart.substring(zeroCount)

        if (zeroCount >= 3 && remainingDigits.length > 0) {
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

          return `${prefix}0.0${subscriptDigits}${remainingDigits}`
        }
      }
    }

    return formatted.replace('$', prefix)
  } catch {
    return `${prefix}${num.toFixed(2)}`
  }
}

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

    return formatted.replace(/\.00([A-Z])/g, '$1')
  } else if (!count) {
    return '0'
  } else {
    return `${count.toFixed(decimals)}`
  }
}
