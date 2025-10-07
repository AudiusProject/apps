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

export type NodeService = DiscoveryProvider | ContentNode

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
  delegators: Array<Delegate>
  delegatedTotal: BN
  totalStakedFor: BN
  minDelegationAmount: BN
} & User

// Transaction

export type TxReceipt = {
  blockHash: string // "0xf44d07e763348730f96c3f18d799f3d656efbccf901525eea2277177559b6f8a"
  blockNumber: number // 236
  contractAddress: null | any // null
  cumulativeGasUsed: number
  events: any // {Approval: {…}}
  from: string // "0x610011d6b4c3b4abc35fa11061e63104fcfecc2a"
  gasUsed: number // 46721
  logsBloom: string // "0x00000000000010000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000200000000000000000000000100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000004000400000000000000000000200000000000000000000000000000000000000000000000028000000000000010000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000"
  status: boolean // true
  to: string // "0xcdbe3ec8fd92a995fc5c3aefea85122f63807083"
  transactionHash: string // "0x5c2549e54f8f04e12c2a9328e47aad54ca28c302ab9379155156124dda87b847"
  transactionIndex: number // 0
}

export type TokenApproveReceipt = {
  txReceipt: TxReceipt
}

// Governance
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
  TargetContractCodeHashChanged = 'TargetContractCodeHashChanged' // Proposal considered invalid since code has at target contract address has changed
}

export type ProposalId = number

export type Proposal = {
  proposalId: ProposalId
  proposer: Wallet
  submissionBlockNumber: number
  targetContractRegistryKey: string // bytes32,
  targetContractAddress: Address
  callValue: number
  functionSignature: string
  callData: string // bytes,
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
