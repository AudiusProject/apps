import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  isVisible: false,
  isAutoCycling: true,
  autoHideTrackDetails: true
}

const slice = createSlice({
  name: 'application/ui/visualizer',
  initialState,
  reducers: {
    toggleVisibility: (state) => {
      state.isVisible = !state.isVisible
    },
    closeVisualizer: (state) => {
      state.isVisible = false
    },
    openVisualizer: (state) => {
      state.isVisible = true
    },
    toggleAutoCycle: (state) => {
      state.isAutoCycling = !state.isAutoCycling
    },
    toggleAutoHideTrackDetails: (state) => {
      state.autoHideTrackDetails = !state.autoHideTrackDetails
    }
  }
})

export const {
  toggleVisibility,
  closeVisualizer,
  openVisualizer,
  toggleAutoCycle,
  toggleAutoHideTrackDetails
} = slice.actions

export default slice.reducer
