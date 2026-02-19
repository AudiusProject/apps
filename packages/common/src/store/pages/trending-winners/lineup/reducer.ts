import { RESET_SUCCEEDED, stripPrefix } from '~/store/lineup/actions'
import { initialLineupState } from '~/store/lineup/reducer'

import { LineupState, Track } from '../../../../models'

import { PREFIX } from './actions'

export const initialState: LineupState<Track> = {
  ...initialLineupState,
  prefix: PREFIX
}

type ResetSucceeded = typeof RESET_SUCCEEDED

type ResetSucceededAction = {
  type: ResetSucceeded
}

const actionsMap = {
  [RESET_SUCCEEDED](
    _state: typeof initialState,
    _action: ResetSucceededAction
  ) {
    const newState = initialState
    return newState
  }
}

const trendingWinnersReducer = (
  state = initialState,
  action: ResetSucceededAction
) => {
  const baseActionType = stripPrefix(PREFIX, action.type) as ResetSucceeded
  const matchingReduceFunction = actionsMap[baseActionType]
  if (!matchingReduceFunction) return state
  return matchingReduceFunction(state, action)
}

export default trendingWinnersReducer
