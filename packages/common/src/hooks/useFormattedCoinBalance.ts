import { useMemo } from 'react'

import { FixedDecimal } from '@audius/fixed-decimal'

import { useCoinBalance } from '../api'
import { useArtistCoin } from '../api/tan-query/coins/useArtistCoin'
import {
  getTokenDecimalPlaces,
  formatCurrencyWithSubscript,
  isNullOrUndefined,
  formatCount,
  formatNumberCommas
} from '../utils'

type UseFormattedCoinBalanceReturn = {
  coinBalance: FixedDecimal | null
  coinBalanceFormatted: string | null
  isCoinBalanceLoading: boolean
  coinPrice: string | null
  coinDollarValue: string
  isCoinPriceLoading: boolean
  heldValue: number | null
  formattedHeldValue: string | null
}

/**
 * Hook to get formatted balance and price information for any supported mint
 * @param mint - The coin mint address to get balance and price for
 * @param locale - Locale for number formatting (defaults to 'en-US')
 * @param isPolling - Whether to enable polling for balance updates
 * @param pollingInterval - Interval for polling in milliseconds (defaults to 3000ms)
 * @param includeExternalWallets - Whether to include external wallet balances (defaults to true)
 * @param includeStaked - Whether to include staked balances (defaults to true)
 * @returns Object with formatted balance, price, and loading states
 */
export const useFormattedCoinBalance = (
  mint: string,
  locale: string = 'en-US',
  isPolling?: boolean,
  pollingInterval?: number,
  includeExternalWallets: boolean = true,
  includeStaked: boolean = true
): UseFormattedCoinBalanceReturn => {
  const { data: coinBalance, isPending: isCoinBalanceLoading } = useCoinBalance(
    {
      mint,
      isPolling,
      pollingInterval,
      includeExternalWallets,
      includeStaked
    }
  )

  const { data, isPending: isCoinPriceLoading } = useArtistCoin(mint)

  const balance = coinBalance?.balance

  const coinPrice = data?.displayPrice
  const hasFetchedCoinBalance = !isNullOrUndefined(balance)

  // Format mint balance with dynamic decimal places
  const coinBalanceFormatted = useMemo(() => {
    if (!hasFetchedCoinBalance || !balance) return null

    // Convert FixedDecimal to number for formatting
    const balanceNumber = Number(balance.toString())
    const decimalPlaces = getTokenDecimalPlaces(balanceNumber)

    // Cap maximumFractionDigits to not exceed the token's native decimal precision
    // FixedDecimal can't format with more decimals than it was constructed with
    const maxFractionDigits = Math.min(decimalPlaces, coinBalance?.decimals)

    // Need formatNumberCommas for mobile :(
    return formatNumberCommas(
      balance.toLocaleString(locale, {
        maximumFractionDigits: maxFractionDigits,
        roundingMode: 'trunc'
      })
    )
  }, [balance, hasFetchedCoinBalance, locale, coinBalance?.decimals])

  // Calculate dollar value of user's mint balance
  const coinDollarValue = useMemo(() => {
    if (!coinPrice) return '$0.00'

    const priceNumber = Number(coinPrice)
    return formatCurrencyWithSubscript(priceNumber)
  }, [coinPrice])

  const heldValue =
    coinPrice && balance ? Number(coinPrice) * Number(balance) : null
  const formattedHeldValue = heldValue
    ? heldValue >= 1
      ? `$${formatCount(heldValue, 2)}`
      : formatCurrencyWithSubscript(heldValue)
    : null

  return {
    coinBalance: balance ?? null,
    coinBalanceFormatted,
    isCoinBalanceLoading,
    coinPrice: coinPrice?.toString() ?? null,
    coinDollarValue,
    isCoinPriceLoading,
    heldValue,
    formattedHeldValue
  }
}
