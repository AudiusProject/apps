import { CommonState } from '~/store/commonStore'

const getBaseState = (state: CommonState) => state.cast

export const getIsCasting = (state: CommonState) =>
  getBaseState(state).isCasting

export const getDeviceName = (state: CommonState) =>
  getBaseState(state).deviceName
