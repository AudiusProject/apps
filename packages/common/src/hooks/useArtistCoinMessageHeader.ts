import { ChatBlastAudience } from '@audius/sdk'

import { useArtistCreatedCoin } from '~/api/tan-query/coins/useArtistCreatedCoin'
import { ID } from '~/models'

export const useArtistCoinMessageHeader = ({
  userId,
  audience
}: {
  userId: ID
  audience?: ChatBlastAudience
}) => {
  const { data: coin } = useArtistCreatedCoin(userId)

  if (!audience || audience !== ChatBlastAudience.COIN_HOLDERS) {
    return null
  }

  let ticker
  if (coin) {
    ticker = `${coin.ticker}`
  }

  return ticker
}
