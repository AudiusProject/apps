import { useSelector as untypedUseSelector } from 'react-redux'
import { Action } from 'redux'

import { UseSelectorHook } from 'common/hooks/useSelector'
import { AppState } from 'store/types'

export const useSelector: UseSelectorHook<AppState> = untypedUseSelector

export const makeReducer = <A extends Action, S>(
  actionsMap: { [action: string]: (state: S, action: A) => S },
  initialState: S
) => {
  return (state = initialState, action: A) => {
    const matchingReduceFunction = actionsMap[action.type]
    if (!matchingReduceFunction) return state
    return matchingReduceFunction(state, action)
  }
}

export type ActionsMap<S> = { [index: string]: (state: S, action: any) => S }
