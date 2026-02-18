import { ChallengeName } from '@audius/common/models'

import { AudioMatchingRewardsModalContent } from './AudioMatchingRewardsModalContent'
import { CosignChallengeModalContent } from './CosignChallengeModalContent'
import { DefaultChallengeContent } from './DefaultChallengeContent'
import { FirstWeeklyCommentChallengeModalContent } from './FirstWeeklyCommentChallengeModalContent'
import { ListenStreakChallengeModalContent } from './ListenStreakChallengeModalContent'
import { OneShotChallengeModalContent } from './OneShotChallengeModalContent'
import { PinnedCommentChallengeModalContent } from './PinnedCommentChallengeModalContent'
import { PlayCountMilestoneContent } from './PlayCountMilestoneContent'
import { ReferralsChallengeModalContent } from './ReferralsChallengeModalContent'
import { RemixContestWinnerChallengeModalContent } from './RemixContestWinnerChallengeModalContent'
import { TastemakerChallengeModalContent } from './TastemakerChallengeModalContent'
import { TrendingRewardsModalContent } from './TrendingRewardsModalContent'
import {
  type ChallengeContentMap,
  type ChallengeContentComponent
} from './types'

export const challengeContentRegistry: ChallengeContentMap = {
  [ChallengeName.AudioMatchingBuy]:
    AudioMatchingRewardsModalContent as ChallengeContentComponent,
  [ChallengeName.AudioMatchingSell]:
    AudioMatchingRewardsModalContent as ChallengeContentComponent,
  [ChallengeName.ListenStreakEndless]:
    ListenStreakChallengeModalContent as ChallengeContentComponent,
  [ChallengeName.OneShot]:
    OneShotChallengeModalContent as ChallengeContentComponent,
  [ChallengeName.FirstWeeklyComment]:
    FirstWeeklyCommentChallengeModalContent as ChallengeContentComponent,
  [ChallengeName.Referrals]:
    ReferralsChallengeModalContent as ChallengeContentComponent,
  [ChallengeName.ReferralsVerified]:
    ReferralsChallengeModalContent as ChallengeContentComponent,
  [ChallengeName.PlayCount250]:
    PlayCountMilestoneContent as ChallengeContentComponent,
  [ChallengeName.PlayCount1000]:
    PlayCountMilestoneContent as ChallengeContentComponent,
  [ChallengeName.PlayCount10000]:
    PlayCountMilestoneContent as ChallengeContentComponent,
  [ChallengeName.Tastemaker]:
    TastemakerChallengeModalContent as ChallengeContentComponent,
  [ChallengeName.Cosign]:
    CosignChallengeModalContent as ChallengeContentComponent,
  [ChallengeName.CommentPin]:
    PinnedCommentChallengeModalContent as ChallengeContentComponent,
  [ChallengeName.RemixContestWinner]:
    RemixContestWinnerChallengeModalContent as ChallengeContentComponent,
  [ChallengeName.TrendingTrack]:
    TrendingRewardsModalContent as ChallengeContentComponent,
  [ChallengeName.TrendingUndergroundTrack]:
    TrendingRewardsModalContent as ChallengeContentComponent,
  default: DefaultChallengeContent as ChallengeContentComponent
}

export const getChallengeContent = (
  challengeName: ChallengeName
): ChallengeContentComponent => {
  return (
    challengeContentRegistry[challengeName] ?? challengeContentRegistry.default
  )
}
