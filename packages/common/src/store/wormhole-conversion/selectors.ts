import type { CommonState } from '../commonStore'

export const getConversionStatus = (state: CommonState) =>
  state.wormholeConversion.status

export const getConversionError = (state: CommonState) =>
  state.wormholeConversion.error
