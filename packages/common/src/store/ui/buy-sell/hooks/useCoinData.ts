import { useMemo } from 'react'

import {
  QueryOptions,
  useCoinBalance,
  useCoinExchangeRate,
  useExternalWalletBalance
} from '~/api'
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

  const balanceFD = externalWalletAddress
    ? externalWalletBalance
    : internalWalletBalanceData?.balance
  const isBalanceLoading = externalWalletAddress
    ? isExternalWalletBalanceLoading
    : isInternalWalletBalanceLoading

  const safeExchangeRateAmount = useMemo(() => {
    return getSafeAmountForExchangeRate(inputAmount)
  }, [inputAmount])

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

  const fullBalance =
    balanceFD && balanceFD.toString() !== '0' ? Number(balanceFD) : 0

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

  const exchangeRate = useMemo(() => {
    return exchangeRateData?.rate ?? null
  }, [exchangeRateData?.rate])

  const displayExchangeRate = useMemo(() => {
    return deriveDisplayExchangeRate(exchangeRateData || null)
  }, [exchangeRateData])

  return {
    balance,
    fullBalance,
    formattedBalance,

    exchangeRate,
    displayExchangeRate,

    isBalanceLoading,
    isExchangeRateLoading,

    balanceError: null, // Simplified for now
    exchangeRateError,

    refetchBalance: () => {}, // Simplified for now
    refetchExchangeRate
  }
}
