import type { Storage } from 'redux-persist'
import { persistReducer } from 'redux-persist'

import { LineupActions, asLineup } from '~/store/lineup/reducer'
import {
  SET_FEED_FILTER,
  SetFeedFilterAction,
  FeedPageAction
} from '~/store/pages/feed/actions'
import { PREFIX as FeedPrefix } from '~/store/pages/feed/lineup/actions'
import feedReducer, {
  initialState as feedLinupInitialState
} from '~/store/pages/feed/lineup/reducer'

import { FeedFilter, Track } from '../../../models'

import { FeedPageState } from './types'

const initialState = {
  feedFilter: FeedFilter.ALL,
  feed: feedLinupInitialState
}

const actionsMap = {
  [SET_FEED_FILTER](state: FeedPageState, action: SetFeedFilterAction) {
    return {
      ...state,
      feedFilter: action.filter
    }
  }
}

const feedLineupReducer = asLineup(FeedPrefix, feedReducer)

const feedPageReducer = (
  state = initialState,
  action: FeedPageAction | LineupActions<Track>
) => {
  const feed = feedLineupReducer(state.feed, action as LineupActions<Track>)
  if (feed !== state.feed) return { ...state, feed }

  const matchingReduceFunction = actionsMap[action.type]
  if (!matchingReduceFunction) return state
  return matchingReduceFunction(state, action as FeedPageAction)
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
