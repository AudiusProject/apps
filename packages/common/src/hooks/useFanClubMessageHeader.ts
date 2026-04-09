import { ChatBlastAudience } from '@audius/sdk'

import { useArtistCreatedFanClub } from '~/api/tan-query/coins/useArtistCreatedFanClub'
import { ID } from '~/models'

export const useFanClubMessageHeader = ({
  userId,
  audience
}: {
  userId: ID
  audience?: ChatBlastAudience
}) => {
  const { data: coin } = useArtistCreatedFanClub(userId)

  if (!audience || audience !== ChatBlastAudience.COIN_HOLDERS) {
    return null
  }

  let ticker
  if (coin) {
    ticker = `${coin.ticker}`
  }

  return ticker
}
