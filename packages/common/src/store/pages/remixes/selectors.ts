import { CommonState } from '~/store/commonStore'

export const getBaseState = (state: CommonState) => state.pages.remixes
export const getTrackId = (state: CommonState) => getBaseState(state).trackId
