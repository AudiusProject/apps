import { useMemo } from 'react'

import { USDC } from '@audius/fixed-decimal'

import { useUserCoins } from '../coins/useUserCoins'
import { useCurrentUserId } from '../users/account/useCurrentUserId'

import { useUSDCBalance } from './useUSDCBalance'

type UseUserTotalBalanceResult = {
  totalBalance: number
  isLoading: boolean
  isError: boolean
}

export const useUserTotalBalance = (): UseUserTotalBalanceResult => {
  const { data: currentUserId } = useCurrentUserId()

  const {
    data: userCoins,
    isLoading: isCoinsLoading,
    isError: isCoinsError
  } = useUserCoins({ userId: currentUserId })

  const {
    data: usdcBalance,
    isLoading: isUsdcLoading,
    error: usdcError
  } = useUSDCBalance()

  const totalBalance = useMemo(() => {
    let total = 0

    if (userCoins) {
      total += userCoins.reduce((sum, coin) => sum + (coin.balanceUsd ?? 0), 0)
    }

    if (usdcBalance) {
      total += Number(USDC(usdcBalance).toString())
    }

    return total
  }, [userCoins, usdcBalance])

  const isLoading = isCoinsLoading || isUsdcLoading
  const isError = isCoinsError || !!usdcError

  return {
    totalBalance,
    isLoading,
    isError
  }
}
