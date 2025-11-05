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

/**
 * Hook to get the total USD balance for the current user including all coins and USDC.
 * Combines balances from:
 * - Artist coins (via useUserCoins)
 * - AUDIO (via useUserCoins)
 * - USDC (via useUSDCBalance)
 *
 * @returns Object with totalBalance, isLoading, and isError
 */
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

    // Add all artist coins + AUDIO
    if (userCoins) {
      total += userCoins.reduce((sum, coin) => sum + (coin.balanceUsd ?? 0), 0)
    }

    // Add USDC (convert to USD, which is 1:1)
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
