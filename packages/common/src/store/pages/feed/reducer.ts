import type { Storage } from 'redux-persist'
import { persistReducer } from 'redux-persist'

import {
  SET_FEED_FILTER,
  SET_FEED_TAB,
  SetFeedFilterAction,
  SetFeedTabAction,
  FeedPageAction
} from '~/store/pages/feed/actions'

import { FeedFilter, FeedTab } from '../../../models'

import { FeedPageState } from './types'

const initialState: FeedPageState = {
  feedFilter: FeedFilter.ALL,
  feedTab: FeedTab.FOR_YOU
}

const actionsMap = {
  [SET_FEED_FILTER](state: FeedPageState, action: SetFeedFilterAction) {
    return {
      ...state,
      feedFilter: action.filter
    }
  },
  [SET_FEED_TAB](state: FeedPageState, action: SetFeedTabAction) {
    return {
      ...state,
      feedTab: action.tab
    }
  }
}

const feedPageReducer = (state = initialState, action: FeedPageAction) => {
  const matchingReduceFunction = actionsMap[action.type as keyof typeof actionsMap]
  if (!matchingReduceFunction) return state
  return matchingReduceFunction(state, action as any)
}

export const feedPagePersistConfig = (storage: Storage) => ({
  key: 'feed-page',
  storage,
  whitelist: ['feedFilter', 'feedTab']
})

const persistedFeedPageReducer = (storage: Storage) => {
  return persistReducer(feedPagePersistConfig(storage), feedPageReducer)
}

export default persistedFeedPageReducer
