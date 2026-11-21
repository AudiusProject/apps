import { createSlice, PayloadAction } from '@reduxjs/toolkit'

import { VoteEvent, Vote } from 'types'

export type State = {
  votes: { [proposalId: number]: VoteEvent[] }
  userVotes: { [proposalId: number]: Vote }
}

export const initialState: State = {
  votes: {},
  userVotes: {}
}

type SetVotes = {
  proposalId: number
  votes: VoteEvent[]
}

type SetUserVote = {
  proposalId: number
  vote: Vote
}

const slice = createSlice({
  name: 'votes',
  initialState,
  reducers: {
    setVotes: (state, action: PayloadAction<SetVotes>) => {
      const { proposalId, votes } = action.payload
      state.votes[proposalId] = votes
    },
    setUserVote: (state, action: PayloadAction<SetUserVote>) => {
      const { proposalId, vote } = action.payload
      state.userVotes[proposalId] = vote
    }
  }
})

export const { setVotes, setUserVote } = slice.actions

export default slice.reducer
