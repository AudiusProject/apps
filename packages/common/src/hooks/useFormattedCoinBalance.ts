import { useMemo } from 'react'

import { FixedDecimal } from '@audius/fixed-decimal'

import { useCoinBalance } from '../api'
import { useFanClub } from '../api/tan-query/coins/useFanClub'
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

  const { data, isPending: isCoinPriceLoading } = useFanClub(mint)

  const balance = coinBalance?.balance

  const coinPrice = data?.displayPrice
  const hasFetchedCoinBalance = !isNullOrUndefined(balance)

  const coinBalanceFormatted = useMemo(() => {
    if (!hasFetchedCoinBalance || !balance) return null

    const balanceNumber = Number(balance.toString())
    const decimalPlaces = getTokenDecimalPlaces(balanceNumber)

    const maxFractionDigits = Math.min(decimalPlaces, coinBalance?.decimals)

    return formatNumberCommas(
      balance.toLocaleString(locale, {
        maximumFractionDigits: maxFractionDigits,
        roundingMode: 'trunc'
      })
    )
  }, [balance, hasFetchedCoinBalance, locale, coinBalance?.decimals])

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
