import { useCurrentAccount, useCurrentAccountUser } from '~/api'

import { ChallengeRewardID } from '../models'
import { getOptimisticUserChallenges } from '../store/challenges/selectors'

import { useProxySelector } from './useProxySelector'

export const useAccountHasClaimableRewards = (challengeRewardsIds: string) => {
  const { data: currentAccount } = useCurrentAccount()
  const { data: currentUser } = useCurrentAccountUser()

  return useProxySelector(
    (state) => {
      if (challengeRewardsIds === null || challengeRewardsIds === '')
        return false

      const activeRewardIds = challengeRewardsIds.split(
        ','
      ) as ChallengeRewardID[]
      if (activeRewardIds.length === 0) return false

      const optimisticUserChallenges = getOptimisticUserChallenges(
        state,
        currentAccount,
        currentUser
      )

      if (
        !optimisticUserChallenges ||
        Object.keys(optimisticUserChallenges).length === 0
      ) {
        return false
      }

      return activeRewardIds.some((rewardId) => {
        const challenge = optimisticUserChallenges[rewardId]
        return challenge && challenge.claimableAmount > 0
      })
    },
    [challengeRewardsIds, currentAccount, currentUser]
  )
}
