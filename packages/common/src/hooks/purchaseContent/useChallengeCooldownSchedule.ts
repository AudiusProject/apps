import { partition, sum } from 'lodash'

import { useCurrentAccount, useCurrentAccountUser } from '~/api'
import {
  ChallengeRewardID,
  UndisbursedUserChallenge
} from '~/models/AudioRewards'
import { getOptimisticUserChallenges } from '~/store/challenges/selectors'
import { CommonState } from '~/store/commonStore'
import { audioRewardsPageSelectors } from '~/store/pages'
import { isCooldownChallengeClaimable } from '~/utils/challenges'
import dayjs, { Dayjs } from '~/utils/dayjs'
import { formatNumberCommas } from '~/utils/formatUtil'
import { utcToLocalTime } from '~/utils/timeUtil'

import { useProxySelector } from '../useProxySelector'

const { getUndisbursedUserChallenges } = audioRewardsPageSelectors

const messages = {
  laterToday: 'Later Today',
  tomorrow: 'Tomorrow',
  readyToClaim: 'Ready to claim!'
}

const TRENDING_CHALLENGE_IDS = new Set(['tt', 'tut'])

const getCooldownChallengeInfo = (
  challenge: UndisbursedUserChallenge,
  now: Dayjs
) => {
  const completedAt = utcToLocalTime(challenge.completed_at)
  const cooldownDays = challenge.cooldown_days ?? 0
  const diff = now.diff(completedAt, 'day')
  const claimableDate = completedAt.add(cooldownDays, 'day')
  const isClose = cooldownDays - diff <= 1
  let label = claimableDate.format('dddd')
  if (diff === cooldownDays) {
    label = messages.laterToday
  } else if (diff === cooldownDays - 1) {
    label = messages.tomorrow
  }
  return {
    label,
    claimableDate,
    isClose
  }
}

export const formatCooldownChallenges = (
  challenges: UndisbursedUserChallenge[]
) => {
  if (challenges.length === 0) return []

  // Memoize the expensive dayjs operation
  const now = dayjs().endOf('day')
  const cooldownDays = challenges[0].cooldown_days ?? 0
  const cooldownChallenges = new Array(cooldownDays)

  challenges.forEach((c) => {
    const completedAt = utcToLocalTime(c.completed_at)
    const diff = now.diff(completedAt, 'day')
    cooldownChallenges[diff] = {
      ...cooldownChallenges[diff],
      id: c.specifier,
      value: (cooldownChallenges[diff]?.value ?? 0) + c.amount,
      ...getCooldownChallengeInfo(c, now)
    }
  })
  return cooldownChallenges
}

/**
 * Returns a list of challenges in cooldown period (not claimable yet), and
 * the total currently claimable amount (for challenges past the cooldown period).
 */
export const useChallengeCooldownSchedule = ({
  challengeId,
  multiple
}: {
  challengeId?: ChallengeRewardID
  multiple?: boolean
}) => {
  const { data: currentAccount } = useCurrentAccount()
  const { data: currentUser } = useCurrentAccountUser()

  return useProxySelector(
    (state: CommonState) => {
      const undisbursedChallenges = getUndisbursedUserChallenges(state)
      const optimisticChallenges = getOptimisticUserChallenges(
        state,
        currentAccount,
        currentUser
      )

      // Filter challenges by ID or multiple flag
      const idFiltered = undisbursedChallenges.filter(
        (c) => multiple || c.challenge_id === challengeId
      )

      // Filter out trending challenges
      const nonTrending = idFiltered.filter(
        (c) => !TRENDING_CHALLENGE_IDS.has(c.challenge_id)
      )

      // Filter out optimistically claimed challenges
      const filteredChallenges = nonTrending.filter((challenge) => {
        const optimisticChallenge = optimisticChallenges[challenge.challenge_id]
        // If there's no optimistic challenge or it has a claimable amount, keep the challenge
        if (!optimisticChallenge || optimisticChallenge.claimableAmount > 0) {
          return true
        }
        // Check if this specific specifier is still undisbursed
        return optimisticChallenge.undisbursedSpecifiers.some(
          (spec) => spec.specifier === challenge.specifier
        )
      })

      // Partition challenges into claimable and cooldown
      const [claimableChallenges, cooldownChallenges] = partition(
        filteredChallenges,
        isCooldownChallengeClaimable
      )

      // Calculate amounts
      const claimableAmount = sum(claimableChallenges.map((c) => c.amount))
      const cooldownAmount = sum(cooldownChallenges.map((c) => c.amount))

      // Create summary if there are claimable amounts
      const summary =
        claimableAmount > 0
          ? {
              id: messages.readyToClaim,
              label: messages.readyToClaim,
              value: formatNumberCommas(claimableAmount)
            }
          : undefined

      const isEmpty = claimableAmount + cooldownAmount === 0

      return {
        claimableChallenges,
        claimableAmount,
        cooldownChallenges,
        cooldownAmount,
        summary,
        isEmpty
      }
    },
    [challengeId, multiple, currentAccount, currentUser]
  )
}
