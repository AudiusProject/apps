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

export const ownedCoinsFilter =
  (wAudioMintAddress: string) =>
  (coin: UserCoin): boolean => {
    return (
      coin.ticker !== 'USDC' &&
      (coin.balance > 0 || coin.mint === wAudioMintAddress)
    )
  }

export const useOwnedCoins = (
  allCoins: CoinInfo[],
  externalWalletAddress?: string
) => {
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

    const userOwnedMints = new Set(
      filteredOwnedCoins.map((coin: UserCoin) => coin.mint)
    )

    if (usdcBalance && usdcBalance > BigInt(0)) {
      userOwnedMints.add(env.USDC_MINT_ADDRESS)
    }

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
