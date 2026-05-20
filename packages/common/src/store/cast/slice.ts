import { createSlice, PayloadAction } from '@reduxjs/toolkit'

import { CastMethod, CastState } from './types'

const initialState: CastState = {
  isCasting: false,
  method: null,
  deviceName: null
}

const slice = createSlice({
  name: 'cast',
  initialState,
  reducers: {
    setIsCasting: (
      state,
      {
        payload: { isCasting, method, deviceName }
      }: PayloadAction<{
        isCasting: boolean
        method?: CastMethod | null
        deviceName?: string | null
      }>
    ) => {
      if (isCasting) {
        state.isCasting = true
        if (method !== undefined) state.method = method
        if (deviceName !== undefined) state.deviceName = deviceName
        return
      }
      // Turn-off only takes effect if the caller is referring to the
      // currently-active method (or didn't specify one). This stops the
      // AirPlay route-change listener from clearing a chromecast session
      // that was set by GoogleCast.tsx — and vice versa.
      if (method && state.method && state.method !== method) return
      state.isCasting = false
      state.method = null
      state.deviceName = null
    }
  }
})

export const { setIsCasting } = slice.actions

export default slice.reducer

export const actions = slice.actions
