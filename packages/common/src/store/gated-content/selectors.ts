import { CommonState } from '../commonStore'

export const getNftAccessSignatureMap = (state: CommonState) =>
  state.gatedContent.nftAccessSignatureMap

export const getGatedContentStatusMap = (state: CommonState) =>
  state.gatedContent.statusMap

export const getLockedContentId = (state: CommonState) =>
  state.gatedContent.lockedContentId

export const getFolloweeIds = (state: CommonState) =>
  state.gatedContent.followeeIds
