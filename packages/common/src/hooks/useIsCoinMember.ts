import { useMemo } from 'react'

import { useUserCoins, useArtistCreatedCoin } from '~/api'
import { ID } from '~/models'

/**
 * Hook to check if a user owns a specific artist's coin
 * @param userId - The user ID to check coin ownership for
 * @param artistId - The artist ID whose coin to check for ownership
 * @returns Object with isCoinHolder boolean and loading state
 */
export const useIsCoinMember = (
  userId: ID | null | undefined,
  artistId: ID | null | undefined
) => {
  const { data: artistCoin } = useArtistCreatedCoin(artistId)
  const { data: userCoins } = useUserCoins(
    { userId },
    { enabled: !!userId && !!artistCoin }
  )

  const isCoinHolder = useMemo(() => {
    if (!artistCoin || !artistId || !userId) {
      return false
    }

    // If the user is the artist themselves, they own their own coin
    if (userId === artistId) {
      return true
    }

    // Check if the user owns this specific artist's coin with positive balance
    return (
      userCoins?.some(
        (userCoin) => userCoin.mint === artistCoin.mint && userCoin.balance > 0
      ) ?? false
    )
  }, [userCoins, artistCoin, artistId, userId])

  const isLoading = !artistCoin || (userId !== artistId && !userCoins)

  return {
    isCoinHolder,
    isLoading
  }
}
