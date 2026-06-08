import { AppState } from 'store/types'

const getBaseState = (state: AppState) => state.application.ui.visualizer

export const getIsVisible = (state: AppState) => getBaseState(state).isVisible

export const getIsAutoCycling = (state: AppState) =>
  getBaseState(state).isAutoCycling ?? true

export const getAutoHideTrackDetails = (state: AppState) =>
  getBaseState(state).autoHideTrackDetails ?? true
