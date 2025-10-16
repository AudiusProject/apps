import { useMemo } from 'react'

import { ChatBlastAudience } from '@audius/sdk'

import {
  useArtistCoinHoldersCount,
  useCurrentAccountUser,
  usePurchasersCount,
  useRemixersCount
} from '~/api'

export const useFirstAvailableBlastAudience = () => {
  const { data: user } = useCurrentAccountUser()

  const { data: purchasersCount } = usePurchasersCount()
  const { data: remixersCount } = useRemixersCount()
  const { data: holdersCount } = useArtistCoinHoldersCount()

  const firstAvailableAudience = useMemo(() => {
    if (user?.follower_count) return ChatBlastAudience.FOLLOWERS
    if (user?.supporter_count) return ChatBlastAudience.TIPPERS
    if (purchasersCount) return ChatBlastAudience.CUSTOMERS
    if (remixersCount) return ChatBlastAudience.REMIXERS
    if (holdersCount) return ChatBlastAudience.COIN_HOLDERS
    return null
  }, [
    user?.follower_count,
    user?.supporter_count,
    purchasersCount,
    remixersCount,
    holdersCount
  ])

  return firstAvailableAudience
}
