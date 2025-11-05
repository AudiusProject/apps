import { useMemo } from 'react'

import { USDC } from '@audius/fixed-decimal'

import type { ID } from '~/models'

import { useUserCoins } from '../coins/useUserCoins'
import { useCurrentUserId } from '../users/account/useCurrentUserId'

import { useUSDCBalance } from './useUSDCBalance'

type UseUserTotalBalanceParams = {
  userId?: ID | null
}

type UseUserTotalBalanceResult = {
  totalBalance: number
  isLoading: boolean
  isError: boolean
}

/**
 * Hook to get the total USD balance for a user including all coins and USDC.
 * Combines balances from:
 * - Artist coins (via useUserCoins)
 * - AUDIO (via useUserCoins)
 * - USDC (via useUSDCBalance, only for current user)
 *
 * @param params - Parameters including optional userId
 * @returns Object with totalBalance, isLoading, and isError
 */
export const useUserTotalBalance = ({
  userId
}: UseUserTotalBalanceParams = {}): UseUserTotalBalanceResult => {
  const { data: currentUserId } = useCurrentUserId()
  const effectiveUserId = userId ?? currentUserId

  const {
    data: userCoins,
    isLoading: isCoinsLoading,
    isError: isCoinsError
  } = useUserCoins({ userId: effectiveUserId })

  // Only fetch USDC balance when viewing own profile (it only works for current user)
  const isOwnProfile = !userId || effectiveUserId === currentUserId
  const {
    data: usdcBalance,
    isLoading: isUsdcLoading,
    error: usdcError
  } = useUSDCBalance({ enabled: isOwnProfile })

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

  const isLoading = isCoinsLoading || (isOwnProfile && isUsdcLoading)
  const isError = isCoinsError || (isOwnProfile && !!usdcError)

  return {
    totalBalance,
    isLoading,
    isError
  }
}
