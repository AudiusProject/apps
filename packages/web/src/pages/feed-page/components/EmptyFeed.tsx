import { useHasAccount } from '@audius/common/api'

import { useIsMobile } from 'hooks/useIsMobile'
import { useRequiresAccount } from 'hooks/useRequiresAccount'

import FollowArtists from './FollowUsers'
import MobileWebEmptyFeed from './MobileWebEmptyFeed'

const EmptyFeed = () => {
  const hasAccount = useHasAccount()
  const isMobile = useIsMobile()
  useRequiresAccount()

  if (!hasAccount) return null

  return isMobile ? <MobileWebEmptyFeed /> : <FollowArtists />
}

export default EmptyFeed
