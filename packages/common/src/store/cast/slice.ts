import { createSlice, PayloadAction } from '@reduxjs/toolkit'

import { CastState } from './types'

const initialState: CastState = {
  isCasting: false,
  deviceName: null
}

const slice = createSlice({
  name: 'cast',
  initialState,
  reducers: {
    setIsCasting: (
      state,
      {
        payload: { isCasting, deviceName }
      }: PayloadAction<{ isCasting: boolean; deviceName?: string | null }>
    ) => {
      state.isCasting = isCasting
      state.deviceName = isCasting ? (deviceName ?? state.deviceName) : null
    }
  }
})

export const { setIsCasting } = slice.actions

export default slice.reducer

export const actions = slice.actions
