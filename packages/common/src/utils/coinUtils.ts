import { UserCoin } from '~/api'

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
