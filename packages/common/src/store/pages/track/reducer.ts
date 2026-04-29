import {
  SET_TRACK_ID,
  SET_TRACK_PERMALINK,
  RESET,
  SetTrackIdAction,
  SetTrackPermalinkAction,
  ResetAction,
  TrackPageAction
} from './actions'
import { TrackPageState } from './types'

const initialState: TrackPageState = {
  trackId: null,
  trackPermalink: null
}

const actionsMap = {
  [SET_TRACK_ID](state: TrackPageState, action: SetTrackIdAction) {
    return {
      ...state,
      trackId: action.trackId
    }
  },
  [SET_TRACK_PERMALINK](
    state: TrackPageState,
    action: SetTrackPermalinkAction
  ) {
    return {
      ...state,
      trackPermalink: action.permalink
    }
  },
  [RESET](_state: TrackPageState, _action: ResetAction) {
    return { ...initialState }
  }
}

const reducer = (state: TrackPageState, action: TrackPageAction) => {
  if (!state) state = initialState
  const matchingReduceFunction = actionsMap[action.type]
  if (!matchingReduceFunction) return state
  return matchingReduceFunction(state, action)
}

export default reducer
