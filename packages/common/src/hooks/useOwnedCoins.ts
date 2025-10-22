import { useMemo } from 'react'

import {
  useCurrentUserId,
  useUserCoins,
  useQueryContext,
  useUSDCBalance,
  UserCoin,
  useWalletCoins
} from '~/api'
import type { CoinInfo } from '~/store'

/**
 * Creates a predicate function for filtering user coins based on balance requirements
 *
 * @param wAudioMintAddress - The WAUDIO mint address from environment
 * @returns Predicate function that can be used with Array.filter()
 */
export const ownedCoinsFilter =
  (wAudioMintAddress: string) =>
  (coin: UserCoin): boolean => {
    // Show all non-USDC tokens with balance > 0
    // OR AUDIO regardless of balance
    return (
      coin.ticker !== 'USDC' &&
      (coin.balance > 0 || coin.mint === wAudioMintAddress)
    )
  }

/**
 * Hook to filter coins based on user ownership and positive balance
 */
export const useOwnedCoins = (
  allCoins: CoinInfo[],
  externalWalletAddress?: string
) => {
  // Fetch external wallet coins if external wallet is provided
  const {
    data: externalWalletCoins = [],
    isLoading: isExternalWalletCoinsLoading
  } = useWalletCoins(
    { walletAddress: externalWalletAddress },
    { refetchInterval: 5000 }
  )
  const { data: currentUserId } = useCurrentUserId()
  const { data: userCoins, isLoading: isUserCoinsLoading } = useUserCoins(
    { userId: currentUserId },
    { refetchInterval: 5000, enabled: !externalWalletAddress }
  )

  const { data: usdcBalance } = useUSDCBalance()
  const { env } = useQueryContext()

  const ownedCoins = externalWalletAddress ? externalWalletCoins : userCoins

  const filteredOwnedCoins = useMemo(() => {
    if (!ownedCoins || !allCoins.length) {
      return []
    }

    const filteredOwnedCoins = ownedCoins.filter(
      ownedCoinsFilter(env.WAUDIO_MINT_ADDRESS)
    )

    // Create a map of user's owned tokens by mint address
    const userOwnedMints = new Set(
      filteredOwnedCoins.map((coin: UserCoin) => coin.mint)
    )

    // Add USDC to owned tokens if user has USDC balance
    if (usdcBalance && usdcBalance > BigInt(0)) {
      userOwnedMints.add(env.USDC_MINT_ADDRESS)
    }

    // Filter available tokens to only include ones the user owns
    const ownedCoinsList = allCoins.filter((coin) =>
      userOwnedMints.has(coin.address)
    )

    return ownedCoinsList
  }, [
    ownedCoins,
    usdcBalance,
    allCoins,
    env.WAUDIO_MINT_ADDRESS,
    env.USDC_MINT_ADDRESS
  ])

  return {
    ownedCoins: filteredOwnedCoins,
    isLoading: externalWalletAddress
      ? isExternalWalletCoinsLoading
      : isUserCoinsLoading
  }
}
