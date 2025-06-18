import { useCallback, useMemo } from 'react'

import { formatUSDCValue } from '@audius/common/api'
import { getCurrencyDecimalPlaces } from '@audius/common/utils'

export type UseTokenAmountFormattingProps = {
  amount?: string | number
  availableBalance: number
  exchangeRate?: number | null
  isStablecoin: boolean
  placeholder?: string
}

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

export const useTokenAmountFormatting = ({
  amount,
  availableBalance,
  exchangeRate,
  isStablecoin,
  placeholder = '0.00'
}: UseTokenAmountFormattingProps) => {
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
    if (isNaN(availableBalance)) return placeholder

    if (isStablecoin) {
      return formatUSDCValue(availableBalance)
    }

    const decimals = getDisplayDecimalPlaces(exchangeRate)

    return availableBalance.toLocaleString('en-US', {
      minimumFractionDigits: defaultDecimalPlaces,
      maximumFractionDigits: decimals
    })
  }, [
    availableBalance,
    exchangeRate,
    getDisplayDecimalPlaces,
    placeholder,
    isStablecoin
  ])

  const formattedAmount = useMemo(() => {
    if (!amount && amount !== 0) return placeholder

    // Use safe value for calculations while preserving original for display logic
    const safeNumericAmount = getSafeNumericValue(amount)
    if (safeNumericAmount === 0) return placeholder

    if (isStablecoin) {
      return formatUSDCValue(safeNumericAmount)
    }

    const decimals = getDisplayDecimalPlaces(exchangeRate)

    return safeNumericAmount.toLocaleString('en-US', {
      minimumFractionDigits: defaultDecimalPlaces,
      maximumFractionDigits: decimals
    })
  }, [amount, exchangeRate, getDisplayDecimalPlaces, placeholder, isStablecoin])

  return {
    formattedAvailableBalance,
    formattedAmount,
    getDisplayDecimalPlaces
  }
}
