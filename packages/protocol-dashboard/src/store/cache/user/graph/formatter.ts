import BN from 'bn.js'

import Audius from 'services/Audius'
import { User, ServiceType, Operator, ServiceProvider } from 'types'

import { FullUser } from './types'

export const formatUser = async (
  aud: Audius,
  user: FullUser
): Promise<User | Operator> => {
  const userWallet = await aud.toChecksumAddress(user.id)

  const delegates = user.delegateTo
    ? await Promise.all(
        user.delegateTo.map(async (delegate) => {
          return {
            wallet: await aud.toChecksumAddress(delegate.toUser.id),
            amount: new BN(delegate.amount),
            activeAmount: new BN(delegate.claimableAmount)
          }
        })
      )
    : []

  const voteHistory = await Promise.all(
    user.votes.map(async (vote) => {
      return {
        proposalId: parseInt(vote.proposal.id),
        voter: await aud.toChecksumAddress(user.id),
        voterStake: new BN(vote.magnitude),
        blockNumber: parseInt(vote.updatedBlockNumber),
        vote: vote.vote
      }
    })
  )

  const formattedUser: User = {
    wallet: userWallet,
    audToken: new BN(user.balance),
    totalDelegatorStake: new BN(user.delegationSentAmount),
    delegates,
    events: [],
    voteHistory,
    pendingUndelegateRequest: user.pendingUndelegateStake
      ? {
          amount: new BN(user.pendingUndelegateStake.amount),
          lockupExpiryBlock: parseInt(user.pendingUndelegateStake.expiryBlock),
          target: user.pendingUndelegateStake.serviceProvider.id
        }
      : { amount: new BN(0), lockupExpiryBlock: 0, target: '' }
  }

  if (
    user.services.length === 0 &&
    user.stakeAmount === '0' &&
    user.claimableDelegationReceivedAmount === '0'
  )
    return formattedUser

  // Note: We must make a contract call to check "validBounds" because that value is not
  // updated with the graph
  const serviceProvider: ServiceProvider =
    await aud.ServiceProviderClient.getServiceProviderDetails(userWallet)

  const protocolMinDelegationAmount =
    await aud.Delegate.getMinDelegationAmount()
  const spMinDelegationAmount =
    await aud.Delegate.getSPMinDelegationAmount(userWallet)
  // Prefer service provider min delegation amount if provided and greater than protocol wide amount
  const minDelegationAmount = spMinDelegationAmount.gt(
    protocolMinDelegationAmount
  )
    ? spMinDelegationAmount
    : protocolMinDelegationAmount

  const delegators = user.delegateFrom
    ? await Promise.all(
        user.delegateFrom.map(async (delegate) => {
          return {
            wallet: await aud.toChecksumAddress(delegate.fromUser.id),
            amount: new BN(delegate.amount),
            activeAmount: new BN(delegate.claimableAmount)
          }
        })
      )
    : []

  return {
    ...formattedUser,
    serviceProvider,
    delegators,
    totalStakedFor: new BN(user.stakeAmount).add(
      new BN(user.delegationReceivedAmount)
    ),
    delegatedTotal: new BN(user.delegationReceivedAmount),
    discoveryProviders:
      user.services
        ?.filter(({ type: { id } }) => id === ServiceType.DiscoveryProvider)
        .map((service) => parseInt(service.spId)) ?? [],
    contentNodes:
      user.services
        ?.filter(({ type: { id } }) => id === ServiceType.ContentNode)
        .map((service) => parseInt(service.spId)) ?? [],
    validators:
      user.services
        ?.filter(({ type: { id } }) => id === ServiceType.Validator)
        .map((service) => parseInt(service.spId)) ?? [],
    pendingDecreaseStakeRequest: user.pendingDecreaseStake
      ? {
          amount: new BN(user.pendingDecreaseStake.decreaseAmount),
          lockupExpiryBlock: parseInt(user.pendingDecreaseStake.expiryBlock)
        }
      : { amount: new BN(0), lockupExpiryBlock: 0 },
    minDelegationAmount
  }
}
