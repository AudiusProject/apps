import { RESET_SUCCEEDED, stripPrefix } from '~/store/lineup/actions'
import { initialLineupState } from '~/store/lineup/reducer'

import { PREFIX } from './actions'

export const initialState = {
  ...initialLineupState,
  prefix: PREFIX
}

const actionsMap: { [key in string]: any } = {
  [RESET_SUCCEEDED](_state: typeof initialState) {
    const newState = initialState
    return newState
  }
}

const tracks = (state = initialState, action: { type: string }) => {
  const baseActionType = stripPrefix(PREFIX, action.type)
  const matchingReduceFunction = actionsMap[baseActionType]
  if (!matchingReduceFunction) return state
  return matchingReduceFunction(state, action)
}

export default tracks
