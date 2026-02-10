import { ChallengeRewardID, SpecifierWithAmount } from '../../../models'

export type TrendingRewardsModalType = 'tracks' | 'underground'
export type ChallengeRewardsModalType = ChallengeRewardID

export type ClaimState =
  | { status: ClaimStatus.NONE }
  | { status: ClaimStatus.CLAIMING }
  | { status: ClaimStatus.CUMULATIVE_CLAIMING }
  | { status: ClaimStatus.WAITING_FOR_RETRY }
  | { status: ClaimStatus.ALREADY_CLAIMED }
  | { status: ClaimStatus.SUCCESS }
  | { status: ClaimStatus.CUMULATIVE_SUCCESS }
  | { status: ClaimStatus.ERROR; aaoErrorCode: number | undefined }

export type AudioRewardsClaim = {
  challengeId: ChallengeRewardID
  specifiers: SpecifierWithAmount[]
  amount: number
}

export enum HCaptchaStatus {
  NONE = 'none',
  SUCCESS = 'success',
  ERROR = 'error',
  USER_CLOSED = 'user_closed'
}

export enum ClaimStatus {
  NONE = 'none',
  CLAIMING = 'claiming',
  CUMULATIVE_CLAIMING = 'cumulative claiming',
  WAITING_FOR_RETRY = 'waiting for retry',
  ALREADY_CLAIMED = 'already claimed',
  SUCCESS = 'success',
  CUMULATIVE_SUCCESS = 'cumulative success',
  ERROR = 'error'
}
