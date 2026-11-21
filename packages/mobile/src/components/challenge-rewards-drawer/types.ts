import type { ReactNode } from 'react'

import type {
  ChallengeName,
  OptimisticUserChallenge
} from '@audius/common/models'
import type { ClaimStatus } from '@audius/common/store'

export type Challenge = OptimisticUserChallenge | null

export type ChallengeContentProps = {
  challenge: Challenge
  challengeName: ChallengeName
  claimStatus: ClaimStatus
  onClaim?: () => void
  onClose: () => void
  children?: ReactNode
}

export type ChallengeRewardsModalState = {
  isOpen: boolean | 'closing'
  challengeName?: ChallengeName
}
