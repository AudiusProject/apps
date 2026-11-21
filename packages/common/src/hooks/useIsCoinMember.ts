import { useMemo } from 'react'

import { useUserCoins, useArtistCreatedFanClub } from '~/api'
import { ID } from '~/models'

export const useIsCoinMember = (
  userId: ID | null | undefined,
  artistId: ID | null | undefined
) => {
  const { data: fanClub } = useArtistCreatedFanClub(artistId)
  const { data: userCoins } = useUserCoins(
    { userId },
    { enabled: !!userId && !!fanClub }
  )

  const isCoinHolder = useMemo(() => {
    if (!fanClub || !artistId || !userId) {
      return false
    }

    if (userId === artistId) {
      return true
    }

    return (
      userCoins?.some(
        (userCoin) => userCoin.mint === fanClub.mint && userCoin.balance > 0
      ) ?? false
    )
  }, [userCoins, fanClub, artistId, userId])

  const isLoading = !fanClub || (userId !== artistId && !userCoins)

  return {
    isCoinHolder,
    isLoading
  }
}
