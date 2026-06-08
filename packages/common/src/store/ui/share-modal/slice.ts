import { createSlice } from '@reduxjs/toolkit'

import { ShareModalState, ShareModalRequestOpenAction } from './types'

const initialState: ShareModalState = {
  source: null,
  request: null
}

const slice = createSlice({
  name: 'applications/ui/shareModal',
  initialState,
  reducers: {
    requestOpen: (state, action: ShareModalRequestOpenAction) => {
      const { source, ...request } = action.payload
      state.request = request
      state.source = source
    },
    reset: (state) => {
      state.request = null
      state.source = null
    }
  }
})

export const { requestOpen, reset } = slice.actions

export default slice.reducer
export const actions = slice.actions
