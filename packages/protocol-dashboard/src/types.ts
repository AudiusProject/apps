import BN from 'bn.js'

import { GetPendingUndelegateRequestResponse } from './services/Audius/delegate/types'
import { GetPendingDecreaseStakeRequestResponse } from './services/Audius/service-provider/types'

export type Version = string
export type Address = string
export type Wallet = string

export type NodeId = number
export type BlockNumber = number
export type Block = any
export type Amount = BN
export type BigNumber = BN

export enum ServiceType {
  DiscoveryProvider = 'discovery-node',
  ContentNode = 'content-node',
  Validator = 'validator'
}

export enum Permission {
  'READ',
  'WRITE'
}

export type Node = {
  owner: Wallet
  endpoint: string
  spID: number
  type: ServiceType
  blockNumber: BlockNumber
  delegateOwnerWallet: Wallet
  country: string
}

export type DiscoveryProvider = {
  type: ServiceType.DiscoveryProvider
  version: Version
  isDeregistered: boolean
} & Node

export type ContentNode = {
  type: ServiceType.ContentNode
  version: Version
  isDeregistered: boolean
} & Node

export type Validator = {
  type: ServiceType.Validator
  version: Version
  isDeregistered: boolean
} & Node

export type NodeService = DiscoveryProvider | ContentNode | Validator

export type ServiceProvider = {
  deployerCut: number
  deployerStake: BigNumber
  maxAccountStake: BigNumber
  minAccountStake: BigNumber
  numberOfEndpoints: number
  validBounds: boolean
}

export type Delegate = {
  wallet: Address
  amount: BN
  activeAmount: BN
  name?: string
  img?: string
}

type EventID = string

export type User = {
  wallet: Address
  name?: string
  image?: string
  audToken: BigNumber
  totalDelegatorStake: BigNumber
  pendingUndelegateRequest: GetPendingUndelegateRequestResponse
  events: Array<EventID>
  delegates: Array<Delegate>
  voteHistory: Array<VoteEvent>
}

export type Operator = {
  serviceProvider: ServiceProvider
  discoveryProviders: Array<number>
  pendingDecreaseStakeRequest: GetPendingDecreaseStakeRequestResponse
  contentNodes: Array<number>
  validators: Array<number>
  delegators: Array<Delegate>
  delegatedTotal: BN
  totalStakedFor: BN
  minDelegationAmount: BN
} & User

export type TxReceipt = {
  blockHash: string
  blockNumber: number
  contractAddress: null | any
  cumulativeGasUsed: number
  events: any
  from: string
  gasUsed: number
  logsBloom: string
  status: boolean
  to: string
  transactionHash: string
  transactionIndex: number
}

export type TokenApproveReceipt = {
  txReceipt: TxReceipt
}

export enum Vote {
  Yes = 'Yes',
  No = 'No'
}

export type VoteEvent = {
  proposalId: ProposalId
  voter: Address
  vote: Vote
  voterStake: BigNumber
  blockNumber: number
}

export enum Outcome {
  InProgress = 'InProgress', // Proposal is active and can be voted on.
  InProgressExecutionDelay = 'InProgressExecutionDelay', // Proposal is active but cannot be voted on because it's in execution delay
  InProgressAwaitingExecution = 'InProgressAwaitingExecution', // Proposal has passed execution delay and can be executed
  Rejected = 'Rejected', // Proposal votingPeriod has closed and vote failed to pass. Proposal will not be executed.
  ApprovedExecuted = 'ApprovedExecuted', // Proposal votingPeriod has closed and vote passed. Proposal was successfully executed.
  QuorumNotMet = 'QuorumNotMet', // Proposal votingPeriod has closed and votingQuorumPercent was not met. Proposal will not be executed.
  ApprovedExecutionFailed = 'ApprovedExecutionFailed', // Proposal vote passed, but transaction execution failed.
  Evaluating = 'Evaluating', // Proposal vote passed, and evaluateProposalOutcome function is currently running.
  Vetoed = 'Vetoed', // Proposal was vetoed by Guardian.
  TargetContractAddressChanged = 'TargetContractAddressChanged', // Proposal considered invalid since target contract address changed
  TargetContractCodeHashChanged = 'TargetContractCodeHashChanged'
}

export type ProposalId = number

export type Proposal = {
  proposalId: ProposalId
  proposer: Wallet
  submissionBlockNumber: number
  targetContractRegistryKey: string
  targetContractAddress: Address
  callValue: number
  functionSignature: string
  callData: string
  outcome: Outcome
  numVotes: number
  voteMagnitudeYes: BigNumber
  voteMagnitudeNo: BigNumber
  name?: string
  description?: string
  evaluatedBlock?: Block
  quorum: BigNumber
}

export type ProposalEvent = {
  proposalId: ProposalId
  proposer: Wallet
  submissionBlockNumber: number
  name: string
  description: string
  blockNumber: number
}

export enum Status {
  Loading = 'Loading',
  Success = 'Success',
  Failure = 'Failure'
}

export enum SortNode {
  Version = 'Version'
}

export enum SortUser {
  activeStake = 'active-stake',
  stakePlusDelegates = 'stake-plus-delegated'
}

export enum PendingTransactionName {
  DecreaseStake = 'Decrease Stake',
  UpdateOperatorCut = 'Update Deployer Cut',
  RemoveDelegator = 'Remove Delegator',
  Undelegate = 'Undelegate',
  Claim = 'Claim'
}

export enum TransactionStatus {
  Ready = 'Ready',
  Pending = 'Pending'
}

export type BasePendingTransaction = {
  name: PendingTransactionName
  lockupDuration: number
  lockupExpiryBlock: BlockNumber
}

export type PendingDecreaseStakeTransaction = BasePendingTransaction & {
  name: PendingTransactionName.DecreaseStake
  amount: BN
}

export type PendingUpdateDeployerCutTransaction = BasePendingTransaction & {
  name: PendingTransactionName.UpdateOperatorCut
  newDeployerCut: number
}

export type PendingUndelegateTransaction = BasePendingTransaction & {
  name: PendingTransactionName.Undelegate
  target: Address
  amount: BN
}

export type PendingRemoveDelegatorTransaction = BasePendingTransaction & {
  name: PendingTransactionName.RemoveDelegator
  target: Address
}

export type PendingClaimTransaction = {
  name: PendingTransactionName.Claim
  status: TransactionStatus
  wallet: Address
}

export type DelayedPendingTransaction =
  | PendingDecreaseStakeTransaction
  | PendingUpdateDeployerCutTransaction
  | PendingUndelegateTransaction
  | PendingRemoveDelegatorTransaction

export type PendingTransaction =
  | PendingClaimTransaction
  | DelayedPendingTransaction

export type Track = {
  title: string
  handle: string
  artwork: string
  url: string
  userUrl: string
}

export type Playlist = {
  title: string
  handle: string
  artwork: string
  plays: number
  url: string
}

export type Album = {
  title: string
  handle: string
  artwork: string
  plays: number
  url: string
}
