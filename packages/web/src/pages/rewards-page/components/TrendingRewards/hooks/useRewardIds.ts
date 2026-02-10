import { ChallengeRewardID } from '@audius/common/models'
import { StringKeys } from '@audius/common/services'

import { useRemoteVar } from 'hooks/useRemoteConfig'

const validRewardIds: Set<ChallengeRewardID> = new Set([
  'trending-track',
  'top-api',
  'verified-upload',
  'trending-underground'
])

/** Pulls rewards from remoteconfig */
export const useRewardIds = () => {
  const rewardsString = useRemoteVar(StringKeys.TRENDING_REWARD_IDS)
  if (!rewardsString) return []
  const rewards = rewardsString.split(',') as ChallengeRewardID[]
  const filteredRewards: ChallengeRewardID[] = rewards.filter((reward) =>
    validRewardIds.has(reward)
  )
  return filteredRewards
}
