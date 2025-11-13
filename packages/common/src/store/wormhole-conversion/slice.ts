import { createSlice, PayloadAction } from '@reduxjs/toolkit'

import { WormholeConversionState } from './types'

const initialState: WormholeConversionState = {
  status: 'IDLE',
  error: null
}

const slice = createSlice({
  name: 'wormholeConversion',
  initialState,
  reducers: {
    startConversion: (state) => {
      state.status = 'CONVERTING'
      state.error = null
    },
    conversionSuccess: (state) => {
      state.status = 'SUCCESS'
      state.error = null
    },
    conversionFailed: (state, action: PayloadAction<{ error: string }>) => {
      state.status = 'ERROR'
      state.error = action.payload.error
    },
    resetConversion: (state) => {
      state.status = 'IDLE'
      state.error = null
    }
  }
})

export const {
  startConversion,
  conversionSuccess,
  conversionFailed,
  resetConversion
} = slice.actions

export const actions = slice.actions

export default slice.reducer
