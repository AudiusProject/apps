import { useCallback, useMemo } from 'react'

import { FixedDecimal } from '@audius/fixed-decimal'

import { getTokenDecimalPlaces, getCurrencyDecimalPlaces } from '~/utils'

export type UseCoinAmountFormattingProps = {
  amount?: string | number
  availableBalance?: number | null
  exchangeRate?: number | null
  isStablecoin: boolean
  decimals: number
  placeholder?: string
}

export const DEFAULT_COIN_AMOUNT_PLACEHOLDER = '0.00'

const defaultDecimalPlaces = 2

// Maximum safe amount for calculations to prevent overflow errors
const MAX_SAFE_AMOUNT = 1000000000000

/**
 * Returns a safe numeric value for calculations, capping extremely large numbers
 */
const getSafeNumericValue = (value: string | number): number => {
  const numericValue = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(numericValue)) return 0
  return Math.min(Math.abs(numericValue), MAX_SAFE_AMOUNT)
}

export const useCoinAmountFormatting = ({
  amount,
  availableBalance,
  isStablecoin,
  decimals,
  placeholder = DEFAULT_COIN_AMOUNT_PLACEHOLDER
}: UseCoinAmountFormattingProps) => {
  const getDisplayDecimalPlaces = useCallback(
    (currentExchangeRate: number | null | undefined) => {
      if (isStablecoin) return defaultDecimalPlaces
      if (currentExchangeRate != null) {
        return getCurrencyDecimalPlaces(currentExchangeRate)
      }
      return defaultDecimalPlaces
    },
    [isStablecoin]
  )

  const formattedAvailableBalance = useMemo(() => {
    if (availableBalance == null || isNaN(availableBalance)) return null

    if (isStablecoin) {
      // Show 2 decimals for amounts >= 0.10, more decimals for smaller amounts
      const absAmount = Math.abs(availableBalance)
      const maxFractionDigits =
        absAmount >= 0.1 ? 2 : getTokenDecimalPlaces(availableBalance)

      // Use FixedDecimal truncation for consistency with cash wallet
      // Create FixedDecimal with the token's decimal precision to avoid rounding during construction
      const fd = new FixedDecimal(availableBalance, decimals)
      const truncatedValue = Number(fd.trunc(maxFractionDigits).toString())

      return truncatedValue.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: maxFractionDigits
      })
    }

    const tokenAmount = new FixedDecimal(availableBalance, decimals)
    const displayDecimals = getTokenDecimalPlaces(availableBalance)
    const maxFractionDigits = Math.min(displayDecimals, decimals)

    return tokenAmount.toLocaleString('en-US', {
      maximumFractionDigits: maxFractionDigits
    })
  }, [availableBalance, isStablecoin, decimals])

  const formattedAmount = useMemo(() => {
    if (!amount && amount !== 0) return null

    // Use safe value for calculations while preserving original for display logic
    const safeNumericAmount = getSafeNumericValue(amount)
    if (safeNumericAmount === 0) return placeholder

    if (isStablecoin) {
      // Show 2 decimals for amounts >= 0.10, more decimals for smaller amounts
      const absAmount = Math.abs(safeNumericAmount)
      const maxFractionDigits =
        absAmount >= 0.1 ? 2 : getTokenDecimalPlaces(safeNumericAmount)

      return safeNumericAmount.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: maxFractionDigits
      })
    }

    const tokenAmount = new FixedDecimal(safeNumericAmount, decimals)
    const displayDecimals = getTokenDecimalPlaces(safeNumericAmount)
    const maxFractionDigits = Math.min(displayDecimals, decimals)

    return tokenAmount.toLocaleString('en-US', {
      maximumFractionDigits: maxFractionDigits
    })
  }, [amount, placeholder, isStablecoin, decimals])

  return {
    formattedAvailableBalance,
    formattedAmount,
    getDisplayDecimalPlaces
  }
}
