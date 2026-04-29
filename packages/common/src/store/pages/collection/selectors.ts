import type { CommonState } from '~/store/commonStore'

export const getCollectionId = (state: CommonState) =>
  state.pages.collection.collectionId
export const getUserUid = (state: CommonState) => state.pages.collection.userUid
export const getCollectionStatus = (state: CommonState) =>
  state.pages.collection.status

export const getCollectionPermalink = (state: CommonState) =>
  state.pages.collection.collectionPermalink
