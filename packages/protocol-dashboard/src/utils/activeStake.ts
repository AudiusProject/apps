import BN from 'bn.js'

import { Operator, User } from 'types'

export const getActiveStake = (user: User | Operator) => {
  let activeDeployerStake: BN = new BN('0')
  let activeDelegatorStake: BN = new BN('0')
  if ('serviceProvider' in user) {
    const { deployerStake } = user.serviceProvider
    const { amount: pendingDecreaseStakeAmount, lockupExpiryBlock } =
      user.pendingDecreaseStakeRequest
    if (lockupExpiryBlock !== 0) {
      activeDeployerStake = deployerStake.sub(pendingDecreaseStakeAmount)
    } else {
      activeDeployerStake = deployerStake
    }
  }

  if (user.pendingUndelegateRequest.lockupExpiryBlock !== 0) {
    activeDelegatorStake = user.totalDelegatorStake.sub(
      user.pendingUndelegateRequest.amount
    )
  } else {
    activeDelegatorStake = user.totalDelegatorStake
  }
  return activeDelegatorStake.add(activeDeployerStake)
}

export const getTotalActiveDelegatedStake = (user: User | Operator) => {
  let total: BN = new BN('0')
  if ('delegators' in user) {
    for (const delegator of user.delegators) {
      total = total.add(delegator.activeAmount)
    }
  }
  return total
}

export default getActiveStake
