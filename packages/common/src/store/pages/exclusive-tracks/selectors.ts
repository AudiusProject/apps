import { CommonState } from '~/store/commonStore'

export const getBaseState = (state: CommonState) => state.pages.exclusiveTracks

export const getLineup = (state: CommonState) => getBaseState(state).tracks

export const getUserId = (state: CommonState) => getBaseState(state).page.userId
