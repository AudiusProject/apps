import {
  ChallengeRewardID,
  UndisbursedUserChallenge,
  OptimisticUserChallenge,
  ChallengeName,
  SpecifierWithAmount
} from '../models'

import dayjs from './dayjs'
import { formatNumberCommas } from './formatUtil'

export type ChallengeRewardsInfo = {
  id: ChallengeRewardID
  shortTitle?: string
  title: string
  description: (amount?: OptimisticUserChallenge | undefined) => string
  fullDescription?: (amount?: OptimisticUserChallenge | undefined) => string
  optionalDescription?: string
  progressLabel?: string
  remainingLabel?: string
  completedLabel?: string
  panelButtonText: string
  isVerifiedChallenge?: boolean
}

export const challengeRewardsConfig: Record<
  ChallengeRewardID,
  ChallengeRewardsInfo
> = {
  [ChallengeName.Referrals]: {
    id: ChallengeName.Referrals,
    title: 'Invite Your Friends!',
    description: (challenge) =>
      `Earn ${challenge?.amount} $AUDIO for you and your friend.`,
    fullDescription: (challenge) =>
      `Invite your Friends! You'll earn ${challenge?.amount} $AUDIO for each friend who joins with your link (and they'll get an $AUDIO too)`,
    progressLabel: '%0 Invites Accepted',
    remainingLabel: '%0 Invites Remain',
    panelButtonText: 'Invite Your Friends'
  },
  [ChallengeName.ReferralsVerified]: {
    id: ChallengeName.ReferralsVerified,
    title: 'Invite your Fans',
    description: (challenge) =>
      `Earn up to ${formatNumberCommas(challenge?.totalAmount ?? '')} $AUDIO`,
    fullDescription: (challenge) =>
      `Invite your fans! You'll earn ${challenge?.amount} $AUDIO for each fan who joins with your link (and they'll get an $AUDIO too)`,
    progressLabel: '%0 Invites Accepted',
    remainingLabel: '%0 Invites Remain',
    panelButtonText: 'Invite your Fans'
  },
  [ChallengeName.Referred]: {
    id: ChallengeName.Referred,
    title: 'You Accepted An Invite',
    description: (challenge) =>
      `You earned ${challenge?.totalAmount ?? ''} $AUDIO for being invited.`,
    fullDescription: (challenge) =>
      `You earned ${challenge?.totalAmount ?? ''} $AUDIO for being invited.`,
    progressLabel: 'Not Earned',
    panelButtonText: 'More Info'
  },
  'connect-verified': {
    id: 'connect-verified',
    title: 'Link Verified Accounts',
    description: (challenge) =>
      `Link your verified social media accounts to earn ${challenge?.amount} $AUDIO.`,
    fullDescription: () =>
      'Get verified on Audius by linking your verified Twitter or Instagram account!',
    progressLabel: 'Not Linked',
    panelButtonText: 'Verify Your Account'
  },
  [ChallengeName.ConnectVerified]: {
    id: ChallengeName.ConnectVerified,
    title: 'Link Verified Accounts',
    description: (challenge) =>
      `Link your verified social media accounts to earn ${challenge?.amount} $AUDIO.`,
    fullDescription: () =>
      'Get verified on Audius by linking your verified Twitter or Instagram account!',
    progressLabel: 'Not Linked',
    panelButtonText: 'Link Verified Account'
  },
  'listen-streak': {
    id: 'listen-streak',
    title: 'Listening Streak: 7 Days',
    description: (challenge) =>
      `Listen to one track a day for seven days to earn ${challenge?.amount} $AUDIO.`,
    fullDescription: () =>
      'Sign in and listen to at least one track every day for 7 days',
    progressLabel: '%0/%1 Days',
    completedLabel: 'Keep Listening',
    panelButtonText: 'Trending on Audius'
  },
  [ChallengeName.ListenStreakEndless]: {
    id: ChallengeName.ListenStreakEndless,
    title: 'Listening Streak',
    description: () =>
      'Listen to music on Audius daily for seven days to start a streak. After that, earn $AUDIO for each consecutive day you continue listening.',
    fullDescription: () =>
      'Listen to music on Audius daily for seven days to start a streak. After that, earn $AUDIO for each consecutive day you continue listening.',
    progressLabel: '%0/%1 Days',
    completedLabel: 'Keep Listening',
    panelButtonText: 'Trending on Audius'
  },
  [ChallengeName.ListenStreak]: {
    id: ChallengeName.ListenStreak,
    title: 'Listening Streak: 7 Days',
    description: (challenge) =>
      `Listen to one track a day for seven days to earn ${challenge?.amount} $AUDIO.`,
    fullDescription: () =>
      'Sign in and listen to at least one track every day for 7 days',
    progressLabel: '%0/%1 Days',
    panelButtonText: 'Trending on Audius'
  },
  'mobile-install': {
    id: 'mobile-install',
    title: 'Get the Audius Mobile App',
    description: (challenge) => `Earn ${challenge?.amount} $AUDIO.`,
    fullDescription: () =>
      'Install the Audius app for iPhone and Android and Sign in to your account!',
    progressLabel: 'Not Installed',
    panelButtonText: 'Get the App'
  },
  [ChallengeName.MobileInstall]: {
    id: ChallengeName.MobileInstall,
    title: 'Get the Audius Mobile App',
    description: (challenge) => `Earn ${challenge?.amount} $AUDIO.`,
    fullDescription: () =>
      'Install the Audius app for iPhone and Android and Sign in to your account!',
    progressLabel: 'Not Installed',
    panelButtonText: 'Get the App'
  },
  'profile-completion': {
    id: 'profile-completion',
    title: 'Complete Your Profile',
    description: (challenge) =>
      `Complete your Audius profile to earn ${challenge?.amount} $AUDIO.`,
    fullDescription: () =>
      'Fill out the missing details on your Audius profile and start interacting with tracks and artists!',
    progressLabel: '%0/%1 Complete',
    completedLabel: 'View Your Profile',
    panelButtonText: 'More Info'
  },
  [ChallengeName.ProfileCompletion]: {
    id: ChallengeName.ProfileCompletion,
    title: 'Complete Your Profile',
    description: (challenge) =>
      `Complete your Audius profile to earn ${challenge?.amount} $AUDIO.`,
    fullDescription: () =>
      'Fill out the missing details on your Audius profile and start interacting with tracks and artists!',
    progressLabel: '%0/%1 Complete',
    panelButtonText: 'More Info'
  },
  'track-upload': {
    id: 'track-upload',
    title: 'Upload 3 Tracks',
    description: (challenge) =>
      `Earn ${challenge?.amount} $AUDIO for uploading 3 tracks.`,
    fullDescription: () => 'Upload 3 tracks to your profile',
    progressLabel: '%0/%1 Uploaded',
    completedLabel: 'Upload More Tracks',
    panelButtonText: 'Upload Tracks'
  },
  [ChallengeName.TrackUpload]: {
    id: ChallengeName.TrackUpload,
    title: 'Upload 3 Tracks',
    description: (challenge) =>
      `Earn ${challenge?.amount} $AUDIO for uploading 3 tracks.`,
    fullDescription: () => 'Upload 3 tracks to your profile',
    progressLabel: '%0/%1 Uploaded',
    panelButtonText: 'Upload Tracks'
  },
  'send-first-tip': {
    id: 'send-first-tip',
    title: 'Send Your First Tip',
    description: (_) =>
      'Show some love to your favorite artist and send them a tip.',
    fullDescription: () =>
      'Show some love to your favorite artist and send them a tip.',
    progressLabel: 'Not Earned',
    completedLabel: 'Tip Another Artist',
    panelButtonText: 'Send a Tip'
  },
  [ChallengeName.FirstTip]: {
    id: ChallengeName.FirstTip,
    title: 'Send Your First Tip',
    description: (_) =>
      'Show some love to your favorite artist and send them a tip.',
    fullDescription: () =>
      'Show some love to your favorite artist and send them a tip.',
    progressLabel: 'Not Earned',
    panelButtonText: 'Send a Tip'
  },
  'first-playlist': {
    id: 'first-playlist',
    title: 'Create a Playlist',
    description: (_) => 'Create a playlist and add a track to it.',
    fullDescription: () => 'Create a playlist and add a track to it.',
    progressLabel: 'Not Earned',
    completedLabel: 'Create Another Playlist',
    panelButtonText: 'Discover Some Tracks'
  },
  [ChallengeName.FirstPlaylist]: {
    id: ChallengeName.FirstPlaylist,
    title: 'Create a Playlist',
    description: (_) => 'Create a playlist and add a track to it.',
    fullDescription: () => 'Create a playlist and add a track to it.',
    progressLabel: 'Not Earned',
    panelButtonText: 'Discover Some Tracks'
  },
  [ChallengeName.AudioMatchingSell]: {
    id: ChallengeName.AudioMatchingSell,
    title: 'Sell to Earn',
    description: (_) =>
      'Receive 5 additional $AUDIO for each dollar earned from sales.',
    fullDescription: () =>
      'Receive 5 additional $AUDIO for each dollar earned from sales.',
    progressLabel: 'No Recent Activity',
    panelButtonText: 'View Details'
  },
  [ChallengeName.AudioMatchingBuy]: {
    id: ChallengeName.AudioMatchingBuy,
    title: 'Spend to Earn',
    description: (_) => 'Earn 1 $AUDIO for each dollar you spend on Audius.',
    fullDescription: () => 'Earn 1 $AUDIO for each dollar you spend on Audius.',
    progressLabel: 'No Recent Activity',
    panelButtonText: 'View Details'
  },
  'trending-playlist': {
    id: 'trending-playlist',
    title: 'Trending Playlists Weekly Top 5',
    description: () => 'Top 5 winners are selected every Friday at Noon PT!',
    panelButtonText: 'See More'
  },
  tp: {
    id: 'trending-playlist',
    title: 'Trending Playlists Weekly Top 5',
    description: () => 'Top 5 winners are selected every Friday at Noon PT!',
    panelButtonText: 'See More'
  },
  'trending-track': {
    title: 'Global Trending Weekly Top 5',
    description: () => 'Top 5 winners are selected every Friday at Noon PT!',
    panelButtonText: 'See More',
    id: 'trending-track'
  },
  tt: {
    title: 'Global Trending Weekly Top 5',
    description: () => 'Top 5 winners are selected every Friday at Noon PT!',
    panelButtonText: 'See More',
    id: 'trending-track'
  },
  'top-api': {
    title: 'API Apps: Monthly Top 10 ',
    description: () => 'The top 10 Audius API apps each month win.',
    panelButtonText: 'More Info',
    id: 'top-api'
  },
  'verified-upload': {
    title: 'First Upload With Your Verified Account',
    description: () =>
      'Verified on Twitter/Instagram? Upload your first track, post it on social media, & tag us.',
    panelButtonText: 'More Info',
    id: 'verified-upload'
  },
  'trending-underground': {
    title: 'Underground Trending Weekly Top 5',
    description: () => 'Top 5 winners are selected every Friday at Noon PT!',
    panelButtonText: 'See More',
    id: 'trending-underground'
  },
  tut: {
    title: 'Underground Trending Weekly Top 5',
    description: () => 'Top 5 winners are selected every Friday at Noon PT!',
    panelButtonText: 'See More',
    id: 'trending-underground'
  },
  [ChallengeName.OneShot]: {
    shortTitle: 'Airdrop 2: Artists',
    title: 'Airdrop 2: Artist Appreciation',
    description: () =>
      `We're thrilled to reward our talented artist community for driving Audius' growth and success!`,
    fullDescription: () =>
      `We're thrilled to reward our talented artist community for driving Audius' growth and success!`,
    optionalDescription:
      '\n\nClaim your tokens before they expire on 05/13/25!',
    panelButtonText: '',
    id: ChallengeName.OneShot,
    remainingLabel: 'Ineligible',
    progressLabel: 'Ready to Claim'
  },
  [ChallengeName.FirstWeeklyComment]: {
    shortTitle: 'First Comment of the Week',
    title: 'First Comment of the Week',
    description: () => 'Your first comment every week will earn $AUDIO.',
    fullDescription: () => 'Your first comment every week will earn $AUDIO.',
    panelButtonText: 'Comment on a Track',
    id: ChallengeName.FirstWeeklyComment
  },
  [ChallengeName.Cosign]: {
    shortTitle: 'Co-signed Remix',
    title: 'Co-signed Remix',
    description: () =>
      'If a remix you’ve uploaded is co-signed by a verified artist, you may earn a reward!',
    fullDescription: () =>
      'If a remix you’ve uploaded is co-signed by a verified artist, you may earn a reward!',
    panelButtonText: 'cosign description',
    id: ChallengeName.Cosign,
    progressLabel: 'Available',
    remainingLabel: 'Available'
  },
  [ChallengeName.PlayCount250]: {
    id: ChallengeName.PlayCount250,
    title: '250 Plays',
    description: () =>
      `Hit 250 plays across all of your tracks to earn an $AUDIO Reward (requires verification).`,
    fullDescription: () =>
      `Hit 250 plays across all of your tracks to earn an $AUDIO Reward (requires verification).`,
    progressLabel: '%0 Plays',
    remainingLabel: '%0 Plays',
    panelButtonText: 'More Info'
  },
  [ChallengeName.PlayCount1000]: {
    id: ChallengeName.PlayCount1000,
    title: '1,000 Plays',
    description: () =>
      `Hit 1,000 plays across all of your tracks to earn an $AUDIO Reward (requires verification).`,
    fullDescription: () =>
      `Hit 1,000 plays across all of your tracks to earn an $AUDIO Reward (requires verification).`,
    progressLabel: '%0 Plays',
    remainingLabel: '%0 Plays',
    panelButtonText: 'More Info'
  },
  [ChallengeName.PlayCount10000]: {
    id: ChallengeName.PlayCount10000,
    title: '10,000 Plays',
    description: () =>
      `Hit 10,000 plays across all of your tracks to earn an $AUDIO Reward (requires verification).`,
    fullDescription: () =>
      `Hit 10,000 plays across all of your tracks to earn an $AUDIO Reward (requires verification).`,
    progressLabel: '%0 Plays',
    remainingLabel: '%0 Plays',
    panelButtonText: 'More Info'
  },
  [ChallengeName.Tastemaker]: {
    id: ChallengeName.Tastemaker,
    title: 'Tastemaker',
    description: () =>
      `Discover and interact with a new track before it hits trending to earn an $AUDIO reward.`,
    fullDescription: () =>
      `Discover and interact with a new track before it hits trending to earn an $AUDIO reward.`,
    progressLabel: 'Active',
    panelButtonText: 'More Info'
  },
  [ChallengeName.CommentPin]: {
    id: ChallengeName.CommentPin,
    title: 'Pinned Comment',
    description: () =>
      'Leave a comment that gets pinned by a verified artist to earn an $AUDIO reward.',
    fullDescription: () =>
      'Leave a comment that gets pinned by a verified artist to earn an $AUDIO reward.',
    progressLabel: 'Not Earned',
    panelButtonText: 'Comment on a Track'
  },
  [ChallengeName.RemixContestWinner]: {
    id: ChallengeName.RemixContestWinner,
    title: 'Remix Contest Winner',
    description: () =>
      'Win a remix contest hosted by a verified artist, and you may earn a reward!',
    fullDescription: () =>
      'Win a remix contest hosted by a verified artist, and you may earn a reward!',
    progressLabel: 'Active',
    panelButtonText: 'More Info'
  }
}

export const makeOptimisticChallengeSortComparator = (
  userChallenges: Partial<Record<ChallengeRewardID, OptimisticUserChallenge>>
): ((id1: ChallengeRewardID, id2: ChallengeRewardID) => number) => {
  const playCountOrder = [
    ChallengeName.PlayCount250,
    ChallengeName.PlayCount1000,
    ChallengeName.PlayCount10000
  ]

  return (id1, id2) => {
    const userChallenge1 = userChallenges[id1]
    const userChallenge2 = userChallenges[id2]

    if (!userChallenge1 || !userChallenge2) {
      return 0
    }

    // Priority 1: Claimable challenges come first
    if (
      userChallenge1.claimableAmount > 0 &&
      userChallenge2.claimableAmount <= 0
    ) {
      return -1
    }
    if (
      userChallenge2.claimableAmount > 0 &&
      userChallenge1.claimableAmount <= 0
    ) {
      return 1
    }

    // Priority 2: New and not disbursed challenges come next
    const isNewAndNotDisbursed = (userChallenge: OptimisticUserChallenge) =>
      isNewChallenge(userChallenge.challenge_id) &&
      userChallenge.state !== 'disbursed'

    const isNew1 = isNewAndNotDisbursed(userChallenge1)
    const isNew2 = isNewAndNotDisbursed(userChallenge2)
    if (isNew1 && !isNew2) {
      return -1
    }
    if (isNew2 && !isNew1) {
      return 1
    }

    // Priority 3: Non-disbursed come before disbursed
    if (
      userChallenge1.state !== 'disbursed' &&
      userChallenge2.state === 'disbursed'
    ) {
      return -1
    }
    if (
      userChallenge2.state !== 'disbursed' &&
      userChallenge1.state === 'disbursed'
    ) {
      return 1
    }

    // Order play count challenges
    if (isPlayCountChallenge(id1) && isPlayCountChallenge(id2)) {
      return playCountOrder.indexOf(id1) - playCountOrder.indexOf(id2)
    }

    return 0
  }
}

export const isPlayCountChallenge = (
  id: ChallengeRewardID
): id is
  | ChallengeName.PlayCount250
  | ChallengeName.PlayCount1000
  | ChallengeName.PlayCount10000 => {
  return (
    id === ChallengeName.PlayCount250 ||
    id === ChallengeName.PlayCount1000 ||
    id === ChallengeName.PlayCount10000
  )
}

export const isAudioMatchingChallenge = (
  challenge: ChallengeRewardID
): challenge is
  | ChallengeName.AudioMatchingSell
  | ChallengeName.AudioMatchingBuy => {
  return (
    challenge === ChallengeName.AudioMatchingSell ||
    challenge === ChallengeName.AudioMatchingBuy
  )
}

/** Returns true if the challenge is not a cooldown challenge by checking
 * whether it has `cooldown_days` defined and whether the challenge has been
 * created for more than `cooldown_days` days.
 */
export const isCooldownChallengeClaimable = (
  challenge: UndisbursedUserChallenge
) => {
  return (
    challenge.cooldown_days === undefined ||
    dayjs.utc().diff(dayjs.utc(challenge.completed_at), 'day') >=
      challenge.cooldown_days
  )
}

/* Filter for only claimable challenges */
export const getClaimableChallengeSpecifiers = (
  specifiers: SpecifierWithAmount[],
  undisbursedUserChallenges: UndisbursedUserChallenge[]
) => {
  return specifiers.filter((s) => {
    const challenge = undisbursedUserChallenges.filter(
      (c) => c.specifier === s.specifier
    )
    if (challenge.length === 0) return false
    // specifiers are unique
    return isCooldownChallengeClaimable(challenge[0])
  })
}

const newChallengeIds: ChallengeRewardID[] = [
  ChallengeName.PlayCount10000,
  ChallengeName.Tastemaker,
  ChallengeName.CommentPin,
  ChallengeName.Cosign,
  ChallengeName.RemixContestWinner
]

export const isNewChallenge = (challengeId: ChallengeRewardID) =>
  newChallengeIds.includes(challengeId)

const DEFAULT_STATUS_LABELS = {
  COMPLETE: 'Complete',
  REWARD_PENDING: 'Reward Pending',
  READY_TO_CLAIM: 'Ready to Claim',
  IN_PROGRESS: 'In Progress',
  AVAILABLE: 'Available',
  INCOMPLETE: 'Incomplete'
} as const

export const getChallengeStatusLabel = (
  challenge: OptimisticUserChallenge | undefined,
  challengeId: ChallengeRewardID
): string => {
  if (!challenge) return DEFAULT_STATUS_LABELS.AVAILABLE

  // Handle special aggregate challenges first
  const shouldShowReset =
    challenge.disbursed_amount &&
    !challenge.claimableAmount &&
    !challenge.undisbursedSpecifiers.length

  switch (challengeId) {
    case ChallengeName.ListenStreakEndless:
      return `Day ${challenge.current_step_count}`
    case ChallengeName.Cosign:
    case ChallengeName.RemixContestWinner:
      if (
        challenge.undisbursedSpecifiers.length &&
        !challenge.claimableAmount &&
        challenge.cooldown_days
      ) {
        return DEFAULT_STATUS_LABELS.REWARD_PENDING
      }
      if (challenge.claimableAmount > 0) {
        return DEFAULT_STATUS_LABELS.READY_TO_CLAIM
      }
      return 'Available'
    case ChallengeName.AudioMatchingBuy:
    case ChallengeName.AudioMatchingSell:
      if (challenge.state === 'completed' && challenge.cooldown_days) {
        return DEFAULT_STATUS_LABELS.REWARD_PENDING
      }
      if (challenge.claimableAmount > 0) {
        return DEFAULT_STATUS_LABELS.READY_TO_CLAIM
      }
      return 'No Recent Activity'
    case ChallengeName.FirstWeeklyComment:
      if (shouldShowReset) {
        return 'Resets Friday'
      }
  }

  // Handle claimable state for non-aggregate rewards
  if (challenge.claimableAmount > 0) {
    return DEFAULT_STATUS_LABELS.READY_TO_CLAIM
  }

  // Handle disbursed state - 2nd clause is for aggregate challenges
  const shouldShowComplete =
    challenge.state === 'disbursed' ||
    (challenge.state === 'completed' &&
      challenge.current_step_count === challenge.max_steps)
  if (shouldShowComplete) {
    return DEFAULT_STATUS_LABELS.COMPLETE
  }

  // Handle completed with cooldown state
  if (challenge.state === 'completed' && challenge.cooldown_days) {
    return DEFAULT_STATUS_LABELS.REWARD_PENDING
  }

  // Handle remaining challenge-specific states
  switch (challengeId) {
    case ChallengeName.OneShot:
      return 'Ineligible'

    case ChallengeName.Referrals:
    case ChallengeName.ReferralsVerified:
      return `${(challenge?.max_steps ?? 0) - (challenge?.current_step_count ?? 0)} Invites Remaining`

    case ChallengeName.ProfileCompletion:
      return `${challenge.current_step_count ?? 0}/7 Complete`

    case ChallengeName.TrackUpload:
      return `${challenge.current_step_count ?? 0}/3 Uploaded`

    // Special-case as this is an infinite aggregate challenge (will always be in-progress)
    case ChallengeName.Tastemaker:
      return DEFAULT_STATUS_LABELS.AVAILABLE

    default:
      if (challenge.state === 'in_progress') {
        return DEFAULT_STATUS_LABELS.IN_PROGRESS
      }
      return DEFAULT_STATUS_LABELS.AVAILABLE
  }
}
