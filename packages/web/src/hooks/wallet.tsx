import { useCurrentUserId, useProfileUser } from '@audius/common/api'
import { useTierAndVerifiedForUser } from '@audius/common/store'

export const useProfileTier = () => {
  const { user: profile } = useProfileUser()
  const { data: accountUserId } = useCurrentUserId()
  const userId = profile?.user_id ?? accountUserId ?? 0
  const { tier } = useTierAndVerifiedForUser(userId)
  return tier === 'none' ? 'gold' : tier
}
