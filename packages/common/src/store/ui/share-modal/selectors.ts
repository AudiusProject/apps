import { CommonState } from '~/store/commonStore'

export const shareModalState = (state: CommonState) => state.ui.shareModal

export const getShareState = (state: CommonState) => shareModalState(state)
export const getShareRequest = (state: CommonState) =>
  shareModalState(state).request
export const getShareSource = (state: CommonState) =>
  shareModalState(state).source
