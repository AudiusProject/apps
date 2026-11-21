import BN from 'bn.js'

import {
  GovernanceProposalEvent,
  GovernanceVoteEvent,
  GovernanceVoteUpdateEvent
} from 'models/TimelineEvents'
import {
  Vote,
  Outcome,
  Proposal,
  ProposalId,
  Address,
  VoteEvent,
  Permission,
  ProposalEvent
} from 'types'

import { AudiusClient } from '../AudiusClient'

import { RawProposal, RawVoteEvent } from './types'

const QUERY_PROPOSAL_START_BLOCK = parseInt(
  import.meta.env.VITE_QUERY_PROPOSAL_START_BLOCK || '0'
)

export default class Governance {
  public aud: AudiusClient

  constructor(aud: AudiusClient) {
    this.aud = aud
  }

  async getProposalById(proposalId: ProposalId) {
    await this.aud.hasPermissions()
    const proposal: RawProposal =
      await this.getContract().getProposalById(proposalId)
    return formatProposal(proposal)
  }

  async getProposalSubmissionById(
    proposalId: ProposalId,
    queryStartBlock = QUERY_PROPOSAL_START_BLOCK
  ) {
    await this.aud.hasPermissions()
    const proposal: ProposalEvent =
      await this.getContract().getProposalSubmission(
        proposalId,
        queryStartBlock
      )
    return proposal
  }

  async getProposalTargetContractHash(proposalId: ProposalId) {
    await this.aud.hasPermissions()
    const contractHash: string =
      await this.getContract().getProposalTargetContractHash(proposalId)
    return contractHash
  }

  async getProposalEvaluationBlock(
    proposalId: ProposalId,
    queryStartBlock = QUERY_PROPOSAL_START_BLOCK
  ) {
    await this.aud.hasPermissions()
    const evaluation = await this.getContract().getProposalEvaluation(
      proposalId,
      queryStartBlock
    )
    const web3 = this.aud.libs.ethWeb3Manager.web3
    const blockNumber = evaluation[0]?.blockNumber
    if (!blockNumber) return null
    const currentBlock = await web3.eth.getBlock(blockNumber)
    return currentBlock
  }

  async getVotingQuorumPercent() {
    await this.aud.hasPermissions()
    const percent: number = await this.getContract().getVotingQuorumPercent()
    return percent
  }

  async getVotingPeriod() {
    await this.aud.hasPermissions()
    const period: number = await this.getContract().getVotingPeriod()
    return period
  }

  async getExecutionDelay() {
    await this.aud.hasPermissions()
    const delay: number = await this.getContract().getExecutionDelay()
    return delay
  }

  async getMaxDescriptionLengthBytes() {
    await this.aud.hasPermissions()
    const length: number = await this.getContract().getMaxDescriptionLength()
    return length
  }

  async getVoteByProposalAndVoter(
    proposalId: ProposalId,
    voterAddress: Address
  ) {
    await this.aud.hasPermissions()
    const vote: 0 | 1 | 2 = await this.getContract().getVoteByProposalAndVoter({
      proposalId,
      voterAddress
    })
    return formatVote(vote)
  }

  async getVoteByProposalForOwner(proposalId: ProposalId) {
    await this.aud.hasPermissions()
    const ownerWallet = this.aud.libs.ethWeb3Manager.ownerWallet
    return this.getVoteByProposalAndVoter(proposalId, ownerWallet)
  }

  async getVotesForProposal(
    proposalId: ProposalId,
    queryStartBlock: number = QUERY_PROPOSAL_START_BLOCK
  ) {
    await this.aud.hasPermissions()
    const votes: RawVoteEvent[] = await this.getContract().getVotes({
      proposalId,
      queryStartBlock
    })
    return votes.map(formatVoteEvent).filter(Boolean) as VoteEvent[]
  }

  async getVoteUpdatesForProposal(
    proposalId: ProposalId,
    queryStartBlock: number = QUERY_PROPOSAL_START_BLOCK
  ) {
    await this.aud.hasPermissions()
    const votes: RawVoteEvent[] = await this.getContract().getVoteUpdates({
      proposalId,
      queryStartBlock
    })
    return votes.map(formatVoteEvent).filter(Boolean) as VoteEvent[]
  }

  async getVotesByAddress(
    addresses: Address[],
    queryStartBlock: number = QUERY_PROPOSAL_START_BLOCK
  ) {
    await this.aud.hasPermissions()
    const votes: RawVoteEvent[] =
      await this.getContract().getVoteSubmissionsByAddress({
        addresses,
        queryStartBlock
      })
    return votes.map(formatVoteEvent).filter(Boolean) as VoteEvent[]
  }

  async getVoteEventsByAddress(
    addresses: Address[],
    queryStartBlock: number = QUERY_PROPOSAL_START_BLOCK
  ): Promise<GovernanceVoteEvent[]> {
    const votes = await this.getVotesByAddress(addresses, queryStartBlock)
    return votes.map((v) => ({
      ...v,
      _type: 'GovernanceVote'
    }))
  }

  async getVoteUpdatesByAddress(
    addresses: Address[],
    queryStartBlock: number = QUERY_PROPOSAL_START_BLOCK
  ) {
    await this.aud.hasPermissions()
    const votes: RawVoteEvent[] =
      await this.getContract().getVoteUpdatesByAddress({
        addresses,
        queryStartBlock
      })
    return votes.map(formatVoteEvent).filter(Boolean) as VoteEvent[]
  }

  async getVoteUpdateEventsByAddress(
    addresses: Address[],
    queryStartBlock: number = QUERY_PROPOSAL_START_BLOCK
  ): Promise<GovernanceVoteUpdateEvent[]> {
    const votes = await this.getVoteUpdatesByAddress(addresses, queryStartBlock)
    return votes.map((v) => ({
      ...v,
      _type: 'GovernanceVoteUpdate'
    }))
  }

  async getProposals(queryStartBlock: number = QUERY_PROPOSAL_START_BLOCK) {
    await this.aud.hasPermissions()
    const proposals = await this.getContract().getProposals(queryStartBlock)
    return proposals
  }

  async getInProgressProposalIds(
    queryStartBlock: number = QUERY_PROPOSAL_START_BLOCK
  ) {
    await this.aud.hasPermissions()
    const proposals: ProposalId[] = (
      await this.getContract().getInProgressProposals(queryStartBlock)
    ).map((p: string) => parseInt(p))
    return proposals
  }

  async getProposalsForAddresses(
    addresses: Address[],
    queryStartBlock: number = QUERY_PROPOSAL_START_BLOCK
  ): Promise<GovernanceProposalEvent[]> {
    await this.aud.hasPermissions()
    const proposals: ProposalEvent[] =
      await this.getContract().getProposalsForAddresses(
        addresses,
        queryStartBlock
      )
    return proposals.map((p) => ({
      ...p,
      _type: 'GovernanceProposal'
    }))
  }

  async getProposalQuorum(proposalId: number): Promise<BN> {
    await this.aud.hasPermissions()
    const quorumAmount: BN =
      await this.getContract().calculateQuorum(proposalId)
    return quorumAmount
  }

  async submitProposal(args: {
    targetContractName: string
    functionSignature: string
    callData: any[]
    name: string
    description: string
  }) {
    const proposal = {
      targetContractRegistryKey:
        this.aud.libs.ethWeb3Manager.web3.utils.utf8ToHex(
          args.targetContractName
        ),
      functionSignature: args.functionSignature,
      callData: args.callData,
      callValue: new BN(0),
      name: args.name,
      description: args.description
    }
    await this.aud.hasPermissions(Permission.WRITE)
    const id: ProposalId = await this.getContract().submitProposal(proposal)
    return id
  }

  async submitVote({
    proposalId,
    vote
  }: {
    proposalId: ProposalId
    vote: Vote
  }) {
    await this.aud.hasPermissions(Permission.WRITE)
    await this.getContract().submitVote({
      proposalId,
      vote: createRawVote(vote)
    })
  }

  async updateVote({
    proposalId,
    vote
  }: {
    proposalId: ProposalId
    vote: Vote
  }) {
    await this.aud.hasPermissions(Permission.WRITE)
    await this.getContract().updateVote({
      proposalId,
      vote: createRawVote(vote)
    })
  }

  async evaluateProposalOutcome({ proposalId }: { proposalId: ProposalId }) {
    await this.aud.hasPermissions(Permission.WRITE)
    await this.getContract().evaluateProposalOutcome(proposalId)
  }

  getContract() {
    return this.aud.libs.ethContracts.GovernanceClient
  }
}

const proposalOutcomeArr = [
  Outcome.InProgress,
  Outcome.Rejected,
  Outcome.ApprovedExecuted,
  Outcome.QuorumNotMet,
  Outcome.ApprovedExecutionFailed,
  Outcome.Evaluating,
  Outcome.Vetoed,
  Outcome.TargetContractAddressChanged,
  Outcome.TargetContractCodeHashChanged
]

const formatProposal = (proposal: RawProposal): Proposal => {
  const outcome = proposalOutcomeArr[proposal.outcome]
  return {
    ...proposal,
    outcome
  }
}

const formatVote = (rawVote: 0 | 1 | 2): Vote | undefined => {
  if (rawVote === 0) return undefined
  const voteMap = {
    1: Vote.No,
    2: Vote.Yes
  }
  return voteMap[rawVote]
}

const formatVoteEvent = (voteEvent: RawVoteEvent): VoteEvent | undefined => {
  const vote = formatVote(voteEvent.vote)
  if (!vote) return undefined
  return {
    ...voteEvent,
    vote
  }
}

const createRawVote = (vote: Vote): 1 | 2 => {
  const voteMap = {
    [Vote.No]: 1,
    [Vote.Yes]: 2
  } as { [vote: string]: 1 | 2 }
  return voteMap[vote]
}
