import type { ReactNode } from 'react'

import type {
  ChallengeName,
  OptimisticUserChallenge
} from '@audius/common/models'
import type { ClaimStatus } from '@audius/common/store'

export type Challenge = OptimisticUserChallenge | null

export type ChallengeContentProps = {
  /** The challenge object containing state and progress */
  challenge: Challenge
  /** The challenge name identifier */
  challengeName: ChallengeName
  /** The current claim status */
  claimStatus: ClaimStatus
  /** Callback for claiming rewards */
  onClaim?: () => void
  /** Callback for closing the drawer */
  onClose: () => void
  /** Optional child content */
  children?: ReactNode
}

export type ChallengeRewardsModalState = {
  isOpen: boolean | 'closing'
  challengeName?: ChallengeName
}
