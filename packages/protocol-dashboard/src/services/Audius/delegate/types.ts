import BN from 'bn.js'

import { Address, BlockNumber } from 'types'

export type UndelegateStakeResponse = {
  delegator: Address
  serviceProvider: Address
  decreaseAmount: BN
}

export type RemoveDelegatorResponse = {
  delegator: Address
  serviceProvider: Address
  unstakedAmount: BN
}

export type GetDelegatorsListResponse = Array<Address>

export type GetPendingUndelegateRequestResponse = {
  amount: BN
  lockupExpiryBlock: BlockNumber
  target: Address
}

export type GetIncreaseDelegateStakeEventsResponse = {
  blockNumber: number
  delegator: Address
  increaseAmount: BN
  serviceProvider: Address
}

export type GetDecreaseDelegateStakeEvaluatedResponse = {
  blockNumber: number
  delegator: Address
  amount: BN
  serviceProvider: Address
}

export type GetDecreaseDelegateStakeRequestedResponse = {
  blockNumber: number
  lockupExpiryBlock: number
  delegator: Address
  amount: BN
  serviceProvider: Address
}

export type GetDecreaseDelegateStakeCancelledEventsResponse = {
  blockNumber: number
  delegator: Address
  amount: BN
  serviceProvider: Address
}

export type GetClaimEventsResponse = {
  blockNumber: number
  claimer: Address
  rewards: BN
  newTotal: BN
}

export type GetSlashEventsResponse = {
  blockNumber: number
  target: Address
  amount: BN
  newTotal: BN
}

export type GetDelegatorRemovedEventsResponse = {
  blockNumber: number
  serviceProvider: Address
  delegator: Address
  unstakedAmount: BN
}
