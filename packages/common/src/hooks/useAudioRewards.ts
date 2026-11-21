import { ChallengeName, OptimisticUserChallenge } from '~/models'
import {
  fillString,
  formatNumberCommas,
  getChallengeStatusLabel
} from '~/utils'

const messages = {
  completeLabel: 'COMPLETE',
  readyToClaim: 'Ready to Claim',
  pendingRewards: 'Reward Pending',
  day: (day: number) => `Day ${day} ${day > 0 ? '🔥' : ''}`
}

export const useFormattedProgressLabel = ({
  challenge,
  progressLabel,
  remainingLabel
}: {
  challenge?: OptimisticUserChallenge
  progressLabel?: string
  remainingLabel?: string
}) => {
  let label: string

  const shouldShowCompleted = challenge?.state === 'disbursed'
  const needsDisbursement = challenge && challenge.claimableAmount > 0
  const pending =
    challenge?.undisbursedSpecifiers &&
    challenge?.undisbursedSpecifiers.length > 0

  if (challenge?.challenge_id === ChallengeName.ListenStreakEndless) {
    label = messages.day(challenge?.current_step_count ?? 0)
  } else if (shouldShowCompleted) {
    label = messages.completeLabel
  } else if (challenge && challenge?.cooldown_days > 0) {
    if (needsDisbursement) {
      label = messages.readyToClaim
    } else if (pending) {
      label = messages.pendingRewards
    } else if (
      challenge?.challenge_type === 'aggregate' &&
      challenge?.max_steps !== null
    ) {
      if (needsDisbursement) {
        label = messages.readyToClaim
      } else if (
        challenge?.challenge_id === ChallengeName.OneShot &&
        challenge?.disbursed_amount > 0
      ) {
        label = messages.completeLabel
      } else {
        label = fillString(
          remainingLabel ?? '',
          formatNumberCommas(
            (
              challenge?.max_steps - challenge?.current_step_count
            )?.toString() ?? ''
          ),
          formatNumberCommas(challenge?.max_steps?.toString() ?? '')
        )
      }
    } else {
      label = fillString(
        progressLabel ?? '',
        formatNumberCommas(challenge?.current_step_count?.toString() ?? ''),
        formatNumberCommas(challenge?.max_steps?.toString() ?? '')
      )
    }
  } else if (
    challenge?.challenge_type === 'aggregate' &&
    challenge?.max_steps !== null
  ) {
    if (needsDisbursement) {
      label = messages.readyToClaim
    } else if (
      challenge?.challenge_id === ChallengeName.OneShot &&
      challenge?.disbursed_amount > 0
    ) {
      label = messages.completeLabel
    } else if (
      challenge?.challenge_id === ChallengeName.FirstWeeklyComment ||
      challenge?.challenge_id === ChallengeName.AudioMatchingBuy ||
      challenge?.challenge_id === ChallengeName.AudioMatchingSell ||
      challenge?.challenge_id === ChallengeName.Cosign
    ) {
      label = getChallengeStatusLabel(challenge, challenge?.challenge_id)
    } else {
      label = fillString(
        remainingLabel ?? '',
        formatNumberCommas(
          (challenge?.max_steps - challenge?.current_step_count)?.toString() ??
            ''
        ),
        formatNumberCommas(challenge?.max_steps?.toString() ?? '')
      )
    }
  } else {
    label = fillString(
      progressLabel ?? '',
      formatNumberCommas(challenge?.current_step_count?.toString() ?? ''),
      formatNumberCommas(challenge?.max_steps?.toString() ?? '')
    )
  }

  return label
}
