import type { Storage } from 'redux-persist'
import { persistReducer } from 'redux-persist'

import {
  SET_FEED_FILTER,
  SetFeedFilterAction,
  FeedPageAction
} from '~/store/pages/feed/actions'

import { FeedFilter } from '../../../models'

import { FeedPageState } from './types'

const initialState = {
  feedFilter: FeedFilter.ALL
}

const actionsMap = {
  [SET_FEED_FILTER](state: FeedPageState, action: SetFeedFilterAction) {
    return {
      ...state,
      feedFilter: action.filter
    }
  }
}

const feedPageReducer = (state = initialState, action: FeedPageAction) => {
  const matchingReduceFunction = actionsMap[action.type]
  if (!matchingReduceFunction) return state
  return matchingReduceFunction(state, action)
}

export const feedPagePersistConfig = (storage: Storage) => ({
  key: 'feed-page',
  storage,
  whitelist: ['feedFilter']
})

const persistedFeedPageReducer = (storage: Storage) => {
  return persistReducer(feedPagePersistConfig(storage), feedPageReducer)
}

export default persistedFeedPageReducer
