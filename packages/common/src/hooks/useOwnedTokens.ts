import { useMemo } from 'react'

import {
  useCurrentUserId,
  useUserCoins,
  useQueryContext,
  useUSDCBalance,
  UserCoin
} from '~/api'
import type { TokenInfo } from '~/store'
import { ownedCoinsFilter } from '~/utils'

/**
 * Hook to filter tokens based on user ownership and positive balance
 */
export const useOwnedTokens = (allTokens: TokenInfo[]) => {
  const { data: currentUserId } = useCurrentUserId()
  const { data: userCoins } = useUserCoins(
    { userId: currentUserId },
    { refetchInterval: 5000 }
  )
  const { data: usdcBalance } = useUSDCBalance()
  const { env } = useQueryContext()

  const ownedTokens = useMemo(() => {
    if (!userCoins || !allTokens.length) {
      return []
    }

    const filteredUserCoins = userCoins.filter(
      ownedCoinsFilter(env.WAUDIO_MINT_ADDRESS)
    )

    // Create a map of user's owned tokens by mint address
    const userOwnedMints = new Set(
      filteredUserCoins.map((coin: UserCoin) => coin.mint)
    )

    // Add USDC to owned tokens if user has USDC balance
    if (usdcBalance && usdcBalance > BigInt(0)) {
      userOwnedMints.add(env.USDC_MINT_ADDRESS)
    }

    // Filter available tokens to only include ones the user owns
    const ownedTokensList = allTokens.filter((token) =>
      userOwnedMints.has(token.address)
    )

    return ownedTokensList
  }, [
    userCoins,
    usdcBalance,
    allTokens,
    env.WAUDIO_MINT_ADDRESS,
    env.USDC_MINT_ADDRESS
  ])

  return {
    ownedTokens,
    isLoading: !userCoins
  }
}
