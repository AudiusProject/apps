import { Nullable } from '~/utils/typeUtils'

export type ChallengeType = 'boolean' | 'numeric' | 'aggregate' | 'trending'

export type UserChallenge = {
  challenge_id: ChallengeRewardID
  challenge_type: ChallengeType
  current_step_count: number
  is_active: boolean
  is_complete: boolean
  is_disbursed: boolean
  max_steps: Nullable<number>
  specifier: Specifier
  user_id: string
  amount: number
  disbursed_amount: number
  cooldown_days: number
}

export type UndisbursedUserChallenge = Pick<
  UserChallenge,
  'challenge_id' | 'amount' | 'specifier' | 'user_id'
> & {
  completed_blocknumber: number
  handle: string
  wallet: string
  created_at: string
  completed_at: string
  cooldown_days?: number
}

export type Specifier = string

export enum ChallengeName {
  AudioMatchingBuy = 'b',
  AudioMatchingSell = 's',
  TrendingTrack = 'tt',
  TrendingUndergroundTrack = 'tut',
  TrackUpload = 'u',
  Referrals = 'r',
  ReferralsVerified = 'rv',
  MobileInstall = 'm',
  ConnectVerified = 'v',
  ProfileCompletion = 'p',
  Referred = 'rd',
  FirstPlaylist = 'fp',
  ListenStreak = 'l',
  ListenStreakEndless = 'e',
  OneShot = 'o',
  FirstWeeklyComment = 'c',
  PlayCount250 = 'p1',
  PlayCount1000 = 'p2',
  PlayCount10000 = 'p3',
  Tastemaker = 't',
  CommentPin = 'cp',
  Cosign = 'cs',
  RemixContestWinner = 'w'
}

export type ChallengeRewardID =
  | 'track-upload'
  | 'mobile-install'
  | 'connect-verified'
  | 'listen-streak'
  | 'profile-completion'
  | 'first-playlist'
  | ChallengeName.AudioMatchingSell
  | ChallengeName.AudioMatchingBuy
  | 'trending-track'
  | 'top-api'
  | 'verified-upload'
  | 'trending-underground'
  | ChallengeName.TrendingTrack
  | ChallengeName.TrendingUndergroundTrack
  | ChallengeName.TrackUpload
  | ChallengeName.Referrals
  | ChallengeName.ReferralsVerified
  | ChallengeName.MobileInstall
  | ChallengeName.ConnectVerified
  | ChallengeName.ProfileCompletion
  | ChallengeName.Referred
  | ChallengeName.FirstPlaylist
  | ChallengeName.ListenStreak
  | ChallengeName.ListenStreakEndless
  | ChallengeName.OneShot
  | ChallengeName.FirstWeeklyComment
  | ChallengeName.PlayCount250
  | ChallengeName.PlayCount1000
  | ChallengeName.PlayCount10000
  | ChallengeName.Tastemaker
  | ChallengeName.CommentPin
  | ChallengeName.Cosign
  | ChallengeName.RemixContestWinner
export enum FailureReason {
  HCAPTCHA = 'HCAPTCHA',
  BLOCKED = 'BLOCKED',
  ALREADY_DISBURSED = 'ALREADY_DISBURSED',
  ALREADY_SENT = 'ALREADY_SENT',
  MISSING_CHALLENGES = 'MISSING_CHALLENGES',
  CHALLENGE_INCOMPLETE = 'CHALLENGE_INCOMPLETE',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  AAO_ATTESTATION_UNKNOWN_RESPONSE = 'AAO_ATTESTATION_UNKNOWN_RESPONSE',
  WAIT_FOR_COOLDOWN = 'WAIT_FOR_COOLDOWN'
}

export type FlowUIOpenEvent = {
  topic: 'ui'
  action: 'opened'
}
export type FlowUICloseEvent = {
  topic: 'ui'
  action: 'closed'
}

export type FlowErrorEvent = {
  topic: 'error'
  message: string
}

export type FlowSessionID = any
export type FlowSessionCreateEvent = {
  topic: 'session'
  action: 'created'

  data: {
    id: FlowSessionID
  }
}
export type FlowSessionResumeEvent = {
  topic: 'session'
  action: 'resumed'

  data: {
    id: FlowSessionID
  }
}
export type FlowSessionPassEvent = {
  topic: 'session'
  action: 'passed'
}
export type FlowSessionFailEvent = {
  topic: 'session'
  action: 'failed'
}
export type FlowSessionEvent =
  | FlowSessionCreateEvent
  | FlowSessionResumeEvent
  | FlowSessionPassEvent
  | FlowSessionFailEvent

export type UserChallengeState =
  | 'inactive'
  | 'incomplete'
  | 'in_progress'
  | 'completed'
  | 'disbursed'

export type SpecifierWithAmount = {
  specifier: string
  amount: number
}

export type OptimisticUserChallenge = Omit<
  UserChallenge,
  'is_complete' | 'is_active' | 'is_disbursed'
> & {
  __isOptimistic: true
  state: UserChallengeState
  totalAmount: number
  claimableAmount: number
  undisbursedSpecifiers: SpecifierWithAmount[]
}
