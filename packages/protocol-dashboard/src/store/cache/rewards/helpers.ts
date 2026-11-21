import BN from 'bn.js'

import AudiusClient from 'services/Audius'
import { User, Operator, Address } from 'types'

const DEPLOYER_CUT_BASE = new BN('100')

export const getOperatorTotalActiveStake = (user: Operator) => {
  const userActiveStake = user.serviceProvider.deployerStake.sub(
    user.pendingDecreaseStakeRequest?.amount ?? new BN('0')
  )
  const userActiveDelegated = user.delegators.reduce((total, delegator) => {
    return total.add(delegator.activeAmount)
  }, new BN('0'))
  const totalActiveStake = userActiveStake.add(userActiveDelegated)
  return totalActiveStake
}

export const getOperatorTotalLocked = (user: Operator) => {
  const lockedPendingDecrease =
    (user as Operator).pendingDecreaseStakeRequest?.amount ?? new BN('0')
  const lockedDelegation = user.delegators.reduce((totalLocked, delegate) => {
    return totalLocked.add(delegate.amount.sub(delegate.activeAmount))
  }, new BN('0'))
  const totalLocked = lockedPendingDecrease.add(lockedDelegation)
  return totalLocked
}

export const getMintedAmountAtBlock = async ({
  aud,
  wallet,
  totalLocked,
  blockNumber,
  fundingAmount
}: {
  aud: AudiusClient
  wallet: Address
  fundingAmount: BN
  totalLocked: BN
  blockNumber: number
}) => {
  const totalStakedAtFundBlockForClaimer = await aud.Staking.totalStakedForAt(
    wallet,
    blockNumber
  )
  const totalStakedAtFundBlock = await aud.Staking.totalStakedAt(blockNumber)
  const activeStake = totalStakedAtFundBlockForClaimer.sub(totalLocked)
  const rewardsForClaimer = activeStake
    .mul(fundingAmount)
    .div(totalStakedAtFundBlock)
  return rewardsForClaimer
}

export const getOperatorRewards = ({
  user,
  totalRewards,
  deployerCutBase = DEPLOYER_CUT_BASE
}: {
  user: Operator
  totalRewards: BN
  deployerCutBase?: BN
}) => {
  const totalActiveStake = getOperatorTotalActiveStake(user)
  const deployerCut = new BN(user.serviceProvider.deployerCut)

  const totalDelegatedRewards = user.delegators.reduce((total, delegate) => {
    const delegateRewards = getDelegateRewards({
      delegateAmount: delegate.activeAmount,
      totalRoundRewards: totalRewards,
      totalActive: totalActiveStake,
      deployerCut,
      deployerCutBase
    })
    return total.add(delegateRewards.delegatorCut)
  }, new BN('0'))

  const operatorRewards = totalRewards.sub(totalDelegatedRewards)
  return operatorRewards
}

export const getDelegateRewards = ({
  delegateAmount,
  totalRoundRewards,
  totalActive,
  deployerCut,
  deployerCutBase = DEPLOYER_CUT_BASE
}: {
  delegateAmount: BN
  totalRoundRewards: BN
  totalActive: BN
  deployerCut: BN
  deployerCutBase?: BN
}) => {
  const rewardsPriorToSPCut = delegateAmount
    .mul(totalRoundRewards)
    .div(totalActive)
  const spDeployerCut = delegateAmount
    .mul(totalRoundRewards)
    .mul(deployerCut)
    .div(totalActive)
    .div(deployerCutBase)
  return {
    spCut: spDeployerCut,
    delegatorCut: rewardsPriorToSPCut.sub(spDeployerCut)
  }
}

export const getRewardForClaimBlock = async ({
  wallet,
  users,
  fundsPerRound,
  blockNumber,
  aud
}: {
  wallet: Address
  users: (User | Operator)[]
  fundsPerRound: BN
  blockNumber: number
  aud: AudiusClient
}) => {
  const user = users.find((u) => u.wallet === wallet)
  let totalRewards = new BN('0')

  if ('serviceProvider' in user!) {
    const lockedPendingDecrease =
      (user as Operator).pendingDecreaseStakeRequest?.amount ?? new BN('0')
    const lockedDelegation =
      await aud.Delegate.getTotalLockedDelegationForServiceProvider(wallet)
    const totalLocked = lockedPendingDecrease.add(lockedDelegation)
    const mintedRewards = await getMintedAmountAtBlock({
      aud,
      totalLocked,
      fundingAmount: fundsPerRound,
      wallet,
      blockNumber
    })
    const operatorRewards = getOperatorRewards({
      user: user as Operator,
      totalRewards: mintedRewards
    })
    totalRewards = totalRewards.add(operatorRewards)
  }

  const delegateToUserRewards: { [address: string]: BN } = {}

  for (const delegate of (user as User).delegates) {
    const operator = users.find((u) => u.wallet === delegate.wallet) as Operator
    const deployerCut = new BN(operator.serviceProvider.deployerCut.toString())
    const operatorActiveStake = getOperatorTotalActiveStake(operator)
    const operatorTotalLocked = getOperatorTotalLocked(operator)
    const userMintedRewards = await getMintedAmountAtBlock({
      aud,
      totalLocked: operatorTotalLocked,
      fundingAmount: fundsPerRound,
      wallet: delegate.wallet,
      blockNumber
    })
    const delegateRewards = getDelegateRewards({
      delegateAmount: delegate.activeAmount,
      totalRoundRewards: userMintedRewards,
      totalActive: operatorActiveStake,
      deployerCut
    })
    delegateToUserRewards[delegate.wallet] = delegateRewards.delegatorCut
    totalRewards = totalRewards.add(delegateRewards.delegatorCut)
  }
  return { totalRewards, delegateToUserRewards }
}
