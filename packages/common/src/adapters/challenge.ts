import { ChallengeResponse, UndisbursedChallenge } from '@audius/sdk/services'
import snakecaseKeys from 'snakecase-keys'

import {
  ChallengeRewardID,
  ChallengeType,
  UserChallenge,
  UndisbursedUserChallenge
} from '~/models/AudioRewards'

export const userChallengeFromSDK = (
  input: ChallengeResponse
): UserChallenge => {
  return {
    ...snakecaseKeys(input),
    amount: Number(input.amount),
    challenge_id: input.challengeId as ChallengeRewardID,
    challenge_type: input.challengeType as ChallengeType,
    cooldown_days: input.cooldownDays ?? 0,
    current_step_count: input.currentStepCount ?? 0,
    max_steps: input.maxSteps ?? null,
    specifier: input.specifier ?? ''
  }
}

export const undisbursedUserChallengeFromSDK = (
  input: UndisbursedChallenge
): UndisbursedUserChallenge => {
  return {
    ...snakecaseKeys(input),
    challenge_id: input.challengeId as ChallengeRewardID,
    amount: Number(input.amount)
  }
}
