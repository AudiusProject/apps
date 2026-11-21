import { User } from '~/models/User'
import { AccountState } from '~/store/account/types'
import {
  getUndisbursedUserChallenges,
  getUserChallenges,
  getUserChallengesOverrides
} from '~/store/pages/audio-rewards/selectors'
import { isCooldownChallengeClaimable } from '~/utils/challenges'
import { removeNullable } from '~/utils/typeUtils'

import {
  ChallengeRewardID,
  OptimisticUserChallenge,
  SpecifierWithAmount,
  UndisbursedUserChallenge,
  UserChallenge,
  UserChallengeState
} from '../../../models/AudioRewards'
import { CommonState } from '../../commonStore'

import { getUserCompletionStages } from './profile-progress'

const getUserChallengeState = (
  challenge: UserChallenge
): UserChallengeState => {
  if (challenge.is_disbursed) {
    return 'disbursed'
  }
  if (
    challenge.is_complete ||
    (challenge.max_steps !== null &&
      challenge.current_step_count >= challenge.max_steps)
  ) {
    return 'completed'
  }
  if (challenge.current_step_count > 0) {
    return 'in_progress'
  }
  if (challenge.is_active) {
    return 'incomplete'
  }
  return 'inactive'
}

export const getOptimisticUserChallengeStepCounts = (
  currentAccount: AccountState | undefined | null,
  currentUser: User | undefined
) => {
  const profileCompletionStages = getUserCompletionStages(
    currentAccount,
    currentUser
  )
  const profileCompletion = Object.values(profileCompletionStages).filter(
    Boolean
  ).length

  const completion: Partial<Record<ChallengeRewardID, number>> = {
    'profile-completion': profileCompletion
  }

  return completion
}
const toOptimisticChallenge = (
  challenge: UserChallenge,
  undisbursed: UndisbursedUserChallenge[],
  stepCountOverrides: Partial<Record<ChallengeRewardID, number>>,
  userChallengesOverrides: Partial<
    Record<ChallengeRewardID, Partial<UserChallenge>>
  >,
  isNativeMobile?: boolean
): OptimisticUserChallenge => {
  const currentStepCountOverride = stepCountOverrides[challenge.challenge_id]
  const userChallengeOverrides = userChallengesOverrides[challenge.challenge_id]

  const challengeOverridden = {
    ...challenge,
    ...userChallengeOverrides
  }

  if (
    !challenge.is_complete &&
    currentStepCountOverride !== undefined &&
    challengeOverridden.max_steps !== null
  ) {
    challengeOverridden.current_step_count = currentStepCountOverride
    challengeOverridden.is_complete =
      currentStepCountOverride >= challengeOverridden.max_steps
  }

  if (challenge.challenge_id === 'mobile-install' && isNativeMobile) {
    challengeOverridden.is_complete = true
  }

  const state = getUserChallengeState(challengeOverridden)
  const totalAmount =
    challenge.challenge_type === 'aggregate' && challenge.max_steps !== null
      ? challenge.amount * challenge.max_steps
      : challenge.amount

  let claimableAmount = 0
  if (challenge.cooldown_days > 0) {
    claimableAmount = undisbursed
      .filter(isCooldownChallengeClaimable)
      .reduce((acc, val) => acc + val.amount, 0)
  } else if (challenge.challenge_type === 'aggregate') {
    claimableAmount = undisbursed.reduce((acc, val) => acc + val.amount, 0)
  } else if (state === 'completed') {
    claimableAmount = challenge.amount
  }

  const undisbursedSpecifiers = undisbursed.reduce(
    (acc, c) => [...acc, { specifier: c.specifier, amount: c.amount }],
    [] as SpecifierWithAmount[]
  )

  return {
    ...challengeOverridden,
    __isOptimistic: true,
    state,
    totalAmount,
    claimableAmount,
    undisbursedSpecifiers
  }
}

export const getOptimisticUserChallenges = (
  state: CommonState,
  currentAccount: AccountState | undefined | null,
  currentUser: User | undefined,
  isNativeMobile?: boolean
) => {
  const stepCountOverrides = getOptimisticUserChallengeStepCounts(
    currentAccount,
    currentUser
  )
  const userChallengesOverrides = getUserChallengesOverrides(state)
  const userChallenges = getUserChallenges(state)
  const undisbursedUserChallenges = getUndisbursedUserChallenges(state).reduce<
    Partial<Record<ChallengeRewardID, UndisbursedUserChallenge[]>>
  >((acc, val) => {
    acc[val.challenge_id] = [...(acc[val.challenge_id] || []), val]
    return acc
  }, {})
  return Object.values(userChallenges)
    .filter(removeNullable)
    .map((challenge) =>
      toOptimisticChallenge(
        challenge,
        undisbursedUserChallenges[challenge.challenge_id] || [],
        stepCountOverrides,
        userChallengesOverrides,
        isNativeMobile
      )
    )
    .reduce(
      (map, challenge) => {
        map[challenge.challenge_id] = challenge
        return map
      },
      {} as Partial<Record<ChallengeRewardID, OptimisticUserChallenge>>
    )
}
