import { CommonState } from '~/store/commonStore'

export const getBaseState = (state: CommonState) => state.pages.exclusiveTracks

export const getUserId = (state: CommonState) => getBaseState(state).userId
