import { useMemo } from 'react'

import { ChatBlastAudience } from '@audius/sdk'

import {
  useArtistCoinMembersCount,
  useArtistCreatedCoin,
  useCurrentAccountUser,
  usePurchasersCount,
  useRemixersCount
} from '~/api'

export const useFirstAvailableBlastAudience = () => {
  const { data: user } = useCurrentAccountUser()

  const { data: purchasersCount } = usePurchasersCount()
  const { data: remixersCount } = useRemixersCount()
  const { data: userCoin } = useArtistCreatedCoin(user?.user_id)
  const { data: coinMembersCount } = useArtistCoinMembersCount({
    mint: userCoin?.mint
  })

  const firstAvailableAudience = useMemo(() => {
    if (user?.follower_count) return ChatBlastAudience.FOLLOWERS
    if (user?.supporter_count) return ChatBlastAudience.TIPPERS
    if (purchasersCount) return ChatBlastAudience.CUSTOMERS
    if (remixersCount) return ChatBlastAudience.REMIXERS
    if (coinMembersCount) return ChatBlastAudience.COIN_HOLDERS
    return null
  }, [
    user?.follower_count,
    user?.supporter_count,
    purchasersCount,
    remixersCount,
    coinMembersCount
  ])

  return firstAvailableAudience
}
