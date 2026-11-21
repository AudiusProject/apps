import { Proposal, VoteEvent } from 'types'

export type RawProposal = Omit<Proposal, 'outcome'> & {
  outcome: number
}

export type RawVoteEvent = Omit<VoteEvent, 'vote'> & {
  vote: 1 | 2
}
