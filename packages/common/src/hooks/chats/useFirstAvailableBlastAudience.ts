import { useMemo } from 'react'

import { ChatBlastAudience } from '@audius/sdk'

import {
  useFanClubMembersCount,
  useArtistCreatedFanClub,
  useCurrentAccountUser,
  usePurchasersCount,
  useRemixersCount
} from '~/api'

export const useFirstAvailableBlastAudience = () => {
  const { data: user } = useCurrentAccountUser()

  const { data: purchasersCount } = usePurchasersCount()
  const { data: remixersCount } = useRemixersCount()
  const { data: userCoin } = useArtistCreatedFanClub(user?.user_id)
  const { data: coinMembersCount } = useFanClubMembersCount({
    mint: userCoin?.mint
  })

  const firstAvailableAudience = useMemo(() => {
    if (user?.follower_count) return ChatBlastAudience.FOLLOWERS
    if (purchasersCount) return ChatBlastAudience.CUSTOMERS
    if (remixersCount) return ChatBlastAudience.REMIXERS
    if (coinMembersCount) return ChatBlastAudience.COIN_HOLDERS
    return null
  }, [user?.follower_count, purchasersCount, remixersCount, coinMembersCount])

  return firstAvailableAudience
}
