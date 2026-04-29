import { createSlice, PayloadAction } from '@reduxjs/toolkit'

import { ID } from '../../../models/Identifiers'

type State = {
  userId: ID | null
}

const initialState: State = {
  userId: null
}

const slice = createSlice({
  name: 'application/pages/exclusiveTracks',
  initialState,
  reducers: {
    reset: (state) => {
      state.userId = null
    },
    setUserId: (state, action: PayloadAction<{ userId: ID }>) => {
      const { userId } = action.payload
      state.userId = userId
    }
  }
})

export const { reset, setUserId } = slice.actions

export default slice.reducer

export const actions = slice.actions
