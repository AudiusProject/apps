import { useMemo } from 'react'

import { FixedDecimal } from '@audius/fixed-decimal'

import { useTokenBalance, useArtistCoin } from '../api'
import {
  getTokenDecimalPlaces,
  formatCurrencyWithSubscript,
  isNullOrUndefined,
  formatCount,
  formatNumberCommas
} from '../utils'

type UseFormattedTokenBalanceReturn = {
  tokenBalance: FixedDecimal | null
  tokenBalanceFormatted: string | null
  isTokenBalanceLoading: boolean
  tokenPrice: string | null
  tokenDollarValue: string
  isTokenPriceLoading: boolean
  heldValue: number | null
  formattedHeldValue: string | null
}

/**
 * Hook to get formatted balance and price information for any supported mint
 * @param mint - The mint symbol to get balance and price for
 * @param locale - Locale for number formatting (defaults to 'en-US')
 * @param isPolling - Whether to enable polling for balance updates
 * @param pollingInterval - Interval for polling in milliseconds (defaults to 3000ms)
 * @returns Object with formatted balance, price, and loading states
 */
export const useFormattedTokenBalance = (
  mint: string,
  locale: string = 'en-US',
  isPolling?: boolean,
  pollingInterval?: number
): UseFormattedTokenBalanceReturn => {
  const { data: tokenBalance, isPending: isTokenBalanceLoading } =
    useTokenBalance({
      mint,
      isPolling,
      pollingInterval
    })

  const { data, isPending: isTokenPriceLoading } = useArtistCoin(mint)

  const balance = tokenBalance?.balance

  const tokenPrice = data?.displayPrice
  const hasFetchedTokenBalance = !isNullOrUndefined(balance)

  // Format mint balance with dynamic decimal places
  const tokenBalanceFormatted = useMemo(() => {
    if (!hasFetchedTokenBalance || !balance) return null

    // Convert FixedDecimal to number for formatting
    const balanceNumber = Number(balance.toString())
    const decimalPlaces = getTokenDecimalPlaces(balanceNumber)

    // Cap maximumFractionDigits to not exceed the token's native decimal precision
    // FixedDecimal can't format with more decimals than it was constructed with
    const maxFractionDigits = Math.min(decimalPlaces, tokenBalance?.decimals)

    // Need formatNumberCommas for mobile :(
    return formatNumberCommas(
      balance.toLocaleString(locale, {
        maximumFractionDigits: maxFractionDigits,
        roundingMode: 'trunc'
      })
    )
  }, [balance, hasFetchedTokenBalance, locale, tokenBalance?.decimals])

  // Calculate dollar value of user's mint balance
  const tokenDollarValue = useMemo(() => {
    if (!tokenPrice) return '$0.00'

    const priceNumber = Number(tokenPrice)
    return formatCurrencyWithSubscript(priceNumber)
  }, [tokenPrice])

  const heldValue =
    tokenPrice && balance ? Number(tokenPrice) * Number(balance) : null
  const formattedHeldValue = heldValue
    ? heldValue >= 1
      ? `$${formatCount(heldValue, 2)}`
      : formatCurrencyWithSubscript(heldValue)
    : null

  return {
    tokenBalance: balance ?? null,
    tokenBalanceFormatted,
    isTokenBalanceLoading,
    tokenPrice: tokenPrice?.toString() ?? null,
    tokenDollarValue,
    isTokenPriceLoading,
    heldValue,
    formattedHeldValue
  }
}
