import type { CommonState } from '~/store/commonStore'

export const getCollectionId = (state: CommonState) =>
  state.pages.collection.collectionId
export const getUserUid = (state: CommonState) => state.pages.collection.userUid
export const getCollectionStatus = (state: CommonState) =>
  state.pages.collection.status
export const getSmartCollectionVariant = (state: CommonState) =>
  state.pages.collection.smartCollectionVariant
export const getCollectionPermalink = (state: CommonState) =>
  state.pages.collection.collectionPermalink

export const getCollectionTracksLineup = (state: CommonState) =>
  state.pages.collection.tracks
