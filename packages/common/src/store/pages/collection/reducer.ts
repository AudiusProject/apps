import { Status } from '../../../models/Status'

import {
  FETCH_COLLECTION,
  FETCH_COLLECTION_SUCCEEDED,
  FETCH_COLLECTION_FAILED,
  RESET_COLLECTION,
  FetchCollectionSucceededAction,
  FetchCollectionFailedAction,
  CollectionPageAction,
  FetchCollectionAction,
  ResetCollectionAction
} from './actions'
import { CollectionsPageState } from './types'

export const initialState: CollectionsPageState = {
  collectionId: null,
  userUid: null,
  status: null,
  collectionPermalink: ''
}

const actionsMap = {
  [FETCH_COLLECTION](
    state: CollectionsPageState,
    _action: FetchCollectionAction
  ) {
    return {
      ...state,
      status: Status.LOADING
    }
  },
  [FETCH_COLLECTION_SUCCEEDED](
    state: CollectionsPageState,
    action: FetchCollectionSucceededAction
  ) {
    return {
      ...state,
      collectionId: action.collectionId,
      userUid: action.userUid,
      status: Status.SUCCESS,
      collectionPermalink: action.collectionPermalink
    }
  },
  [FETCH_COLLECTION_FAILED](
    state: CollectionsPageState,
    action: FetchCollectionFailedAction
  ) {
    return {
      ...state,
      userUid: action.userUid,
      status: Status.ERROR
    }
  },
  [RESET_COLLECTION](
    state: CollectionsPageState,
    _action: ResetCollectionAction
  ) {
    return {
      ...state,
      ...initialState
    }
  }
}

const reducer = (state: CollectionsPageState, action: CollectionPageAction) => {
  if (!state) {
    state = initialState
  }
  const matchingReduceFunction = (actionsMap as any)[action.type]
  if (!matchingReduceFunction) return state
  return matchingReduceFunction(state, action)
}

export default reducer
