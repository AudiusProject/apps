/**
 * Combined hook for managing token balance and exchange rate data
 * Consolidates data fetching and provides clean interface to consumers
 * Supports fetching balance for any specified token mint address
 */

import { useMemo } from 'react'

import { QueryOptions, useCoinBalance, useCoinExchangeRate } from '~/api'
import { useExternalWalletBalance } from '~/api/tan-query/wallets/useExternalWalletBalance'
import { getTokenDecimalPlaces } from '~/utils'

import type { CoinInfo, TokenDataHookResult } from '../types/swap.types'
import {
  deriveDisplayExchangeRate,
  getSafeAmountForExchangeRate
} from '../utils/tokenCalculations'

export type UseTokenDataProps = {
  inputCoin: CoinInfo
  outputCoin: CoinInfo
  inputAmount: number
  externalWalletAddress?: string
  queryOptions?: QueryOptions
}

export const useCoinData = ({
  inputCoin,
  outputCoin,
  inputAmount,
  externalWalletAddress,
  queryOptions
}: UseTokenDataProps): TokenDataHookResult => {
  // Get token balance from internal wallet
  const {
    data: internalWalletBalanceData,
    isPending: isInternalWalletBalanceLoading
  } = useCoinBalance({
    mint: inputCoin.address,
    includeExternalWallets: false,
    includeStaked: false,
    enabled: !externalWalletAddress,
    ...queryOptions
  })

  // Get token balance from an explicit external wallet
  const {
    data: externalWalletBalance,
    isPending: isExternalWalletBalanceLoading
  } = useExternalWalletBalance(
    {
      walletAddress: externalWalletAddress,
      mint: inputCoin.address
    },
    { ...queryOptions, enabled: !!externalWalletAddress }
  )

  // Use whichever balance based on configuration
  const balanceFD = externalWalletAddress
    ? externalWalletBalance
    : internalWalletBalanceData?.balance
  const isBalanceLoading = externalWalletAddress
    ? isExternalWalletBalanceLoading
    : isInternalWalletBalanceLoading

  // Get token price for calculations (currently unused but may be needed for future features)
  // const { data: tokenPriceData } = useArtistCoin({ mint: inputCoin.address })

  // Calculate safe amount for exchange rate API
  const safeExchangeRateAmount = useMemo(() => {
    return getSafeAmountForExchangeRate(inputAmount)
  }, [inputAmount])

  // Get exchange rate data
  const {
    data: exchangeRateData,
    isLoading: isExchangeRateLoading,
    error: exchangeRateError,
    refetch: refetchExchangeRate
  } = useCoinExchangeRate({
    inputMint: inputCoin.address,
    outputMint: outputCoin.address,
    inputDecimals: inputCoin.decimals,
    outputDecimals: outputCoin.decimals,
    inputAmount: safeExchangeRateAmount > 0 ? safeExchangeRateAmount : 1
  })

  // Process balance data
  // fullBalance: the complete untruncated balance for swap calculations
  const fullBalance =
    balanceFD && balanceFD.toString() !== '0' ? Number(balanceFD) : 0

  // balance: truncated balance for display purposes only
  const displayDecimals = getTokenDecimalPlaces(Number(balanceFD))
  const maxFractionDigits = Math.min(displayDecimals, inputCoin.decimals)
  const balance =
    balanceFD && balanceFD.toString() !== '0'
      ? Number(balanceFD.trunc(maxFractionDigits))
      : 0
  const formattedBalance = useMemo(() => {
    if (!balance) return '0'
    return balance.toString()
  }, [balance])

  // Process exchange rate data
  const exchangeRate = useMemo(() => {
    return exchangeRateData?.rate ?? null
  }, [exchangeRateData?.rate])

  const displayExchangeRate = useMemo(() => {
    return deriveDisplayExchangeRate(exchangeRateData || null)
  }, [exchangeRateData])

  return {
    // Balance data
    balance,
    fullBalance,
    formattedBalance,

    // Exchange rate data
    exchangeRate,
    displayExchangeRate,

    // Loading states
    isBalanceLoading,
    isExchangeRateLoading,

    // Error states
    balanceError: null, // Simplified for now
    exchangeRateError,

    // Refetch functions
    refetchBalance: () => {}, // Simplified for now
    refetchExchangeRate
  }
}
