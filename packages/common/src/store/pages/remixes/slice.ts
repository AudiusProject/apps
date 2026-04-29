import { createSlice, PayloadAction } from '@reduxjs/toolkit'

import { ID } from '../../../models/Identifiers'

type State = {
  trackId: ID | null
  count: number | null
}

const initialState: State = {
  trackId: null,
  count: null
}

const slice = createSlice({
  name: 'application/pages/remixes',
  initialState,
  reducers: {
    reset: (state) => {
      state.trackId = null
      state.count = null
    },
    fetchTrackSucceeded: (state, action: PayloadAction<{ trackId: ID }>) => {
      const { trackId } = action.payload
      state.trackId = trackId
    },
    setCount: (state, action: PayloadAction<{ count: number }>) => {
      const { count } = action.payload
      state.count = count
    }
  }
})

export const { reset, setCount, fetchTrackSucceeded } = slice.actions
export default slice.reducer
export const actions = slice.actions
