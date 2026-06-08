import { createSlice } from '@reduxjs/toolkit'

import { ID } from '../../../models/Identifiers'

type State = {
  trackId: ID | null
}

const initialState: State = {
  trackId: null
}

const slice = createSlice({
  name: 'application/pages/pick-winners',
  initialState,
  reducers: {}
})

export default slice.reducer

export const actions = slice.actions
