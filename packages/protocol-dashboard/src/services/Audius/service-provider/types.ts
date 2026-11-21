import BN from 'bn.js'

import {
  Address,
  BlockNumber,
  Node,
  ServiceType,
  TokenApproveReceipt,
  TxReceipt
} from 'types'

export type NodeList = Array<Node>
export type GetServiceProviderIdsFromAddressResponse = Array<number>
export type GetPendingDecreaseStakeRequestResponse = {
  lockupExpiryBlock: BlockNumber
  amount: BN
}
export type GetServiceEndpointInfoFromAddressResponse = NodeList
export type GetServiceProviderListResponse = NodeList
export type DeregisterResponse = {
  txReceipt: TxReceipt
  spID: number
  serviceType: ServiceType
  owner: Address
  endpoint: string
}
export type RegisterResponse = {
  txReceipt: TxReceipt
  spID: number
  serviceType: ServiceType
  owner: Address
  endpoint: string
  tokenApproveReceipt: any
}
export type RegisterWithDelegateResponse = RegisterResponse
export type IncreaseStakeResponse = {
  txReceipt: TxReceipt
  tokenApproveReceipt: TokenApproveReceipt
}
export type DecreaseStakeResponse = { txReceipt: TxReceipt }

export type GetRegisteredServiceProviderEventsResponse = {
  blockNumber: number
  spID: number
  serviceType: string
  owner: Address
  endpoint: string
  stakeAmount: BN
}

export type GetDeregisteredServiceProviderEventsResponse = {
  blockNumber: number
  spID: number
  serviceType: string
  owner: Address
  endpoint: string
  stakeAmount: BN
}

export type GetIncreasedStakeEventResponse = {
  blockNumber: number
  owner: Address
  increaseAmount: BN
  newStakeAmount: BN
}

export type GetDecreasedStakeEvaluatedEventsResponse = {
  blockNumber: number
  owner: Address
  decreaseAmount: BN
  newStakeAmount: BN
}

export type GetDecreasedStakeRequestedEventsResponse = {
  blockNumber: number
  owner: Address
  decreaseAmount: BN
  lockupExpiryBlock: number
}

export type GetDecreasedStakeCancelledEventsResponse = {
  blockNumber: number
  owner: Address
  decreaseAmount: BN
  lockupExpiryBlock: number
}
