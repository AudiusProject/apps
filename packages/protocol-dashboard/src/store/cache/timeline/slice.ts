import { createSlice, PayloadAction } from '@reduxjs/toolkit'

import { TimelineEvent } from 'models/TimelineEvents'
import { Address } from 'types'

export type State = {
  timelines: { [wallet: string]: TimelineEvent[] }
}

export const initialState: State = {
  timelines: {}
}

type SetTimeline = {
  wallet: Address
  timeline: TimelineEvent[]
}

const slice = createSlice({
  name: 'timeline',
  initialState,
  reducers: {
    setTimeline: (state, action: PayloadAction<SetTimeline>) => {
      const { wallet, timeline } = action.payload
      state.timelines[wallet] = timeline
    }
  }
})

export const { setTimeline } = slice.actions

export default slice.reducer
