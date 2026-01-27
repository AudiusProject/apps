import { ChallengeName, ChallengeRewardID } from '@audius/common/models'
import { StringKeys } from '@audius/common/services'

import { useRemoteVar } from 'hooks/useRemoteConfig'

const validRewardIds: Set<ChallengeRewardID> = new Set([
  'track-upload',
  'mobile-install',
  'listen-streak',
  'profile-completion',
  'send-first-tip',
  'first-playlist',
  ChallengeName.AudioMatchingSell, // $AUDIO matching seller
  ChallengeName.AudioMatchingBuy, // $AUDIO matching buyer
  ChallengeName.FirstPlaylist,
  ChallengeName.FirstTip,
  ChallengeName.MobileInstall,
  ChallengeName.ProfileCompletion,
  ChallengeName.Referrals,
  ChallengeName.ReferralsVerified,
  ChallengeName.Referred,
  ChallengeName.TrackUpload,
  ChallengeName.ListenStreak,
  ChallengeName.OneShot,
  ChallengeName.ListenStreakEndless,
  ChallengeName.FirstWeeklyComment,
  ChallengeName.PlayCount250,
  ChallengeName.PlayCount1000,
  ChallengeName.PlayCount10000,
  ChallengeName.Tastemaker,
  ChallengeName.CommentPin,
  ChallengeName.Cosign,
  ChallengeName.RemixContestWinner
])

/** Pulls rewards from remoteconfig */
export function useRewardIds(
  hideConfig: Partial<Record<ChallengeRewardID, boolean>>
) {
  const rewardsString = useRemoteVar(StringKeys.CHALLENGE_REWARD_IDS)
  if (rewardsString === null) return []
  const rewards = rewardsString.split(',') as ChallengeRewardID[]
  const filteredRewards: ChallengeRewardID[] = rewards.filter(
    (reward) => validRewardIds.has(reward) && !hideConfig[reward]
  )
  return filteredRewards
}
