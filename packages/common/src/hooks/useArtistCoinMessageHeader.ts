import { ChatBlastAudience } from '@audius/sdk'

import { useArtistOwnedCoin } from '~/api/tan-query/coins/useArtistOwnedCoin'
import { ID } from '~/models'

export const useArtistCoinMessageHeader = ({
  userId,
  audience
}: {
  userId: ID
  audience?: ChatBlastAudience
}) => {
  const { data: coin } = useArtistOwnedCoin(userId)

  if (!audience || audience !== ChatBlastAudience.COIN_HOLDERS) {
    return null
  }

  let ticker
  if (coin) {
    ticker = `${coin.ticker}`
  }

  return ticker
}
