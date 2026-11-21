import { noop } from 'lodash'
import { createReducer, ActionType } from 'typesafe-actions'

import {
  ADD_CONFIRMATION_CALL,
  SET_CONFIRMATION_RESULT,
  ADD_COMPLETION_CALL,
  CLEAR_COMPLETE,
  CLEAR_CONFIRM,
  INCREMENT_CONFIRM_GROUP_INDEX,
  SET_OPERATION_SUCCESS_CALL
} from './actions'
import * as actions from './actions'
import { ConfirmerState } from './types'

export const initialState = {
  confirm: {},
  complete: {},
  operationSuccessCallIdx: {}
} as ConfirmerState

type ConfirmerActions = ActionType<typeof actions>

const reducer = createReducer<ConfirmerState, ConfirmerActions>(initialState, {
  [ADD_CONFIRMATION_CALL](state, action) {
    const { operationId, squashable, parallelizable } =
      action.confirmationOptions
    const newCall = {
      call: action.confirmationCall,
      result: null,
      squashable,
      operationId,
      parallelizable
    }
    const newConfirm = { ...state.confirm }
    if (action.uid in state.confirm) {
      newConfirm[action.uid] = {
        ...state.confirm[action.uid],
        calls: [...state.confirm[action.uid].calls, newCall]
      }
    } else {
      newConfirm[action.uid] = {
        index: 0,
        calls: [newCall]
      }
    }

    return {
      ...state,
      confirm: newConfirm
    }
  },
  [actions.CANCEL_CONFIRMATION_CALL](state, action) {
    const newConfirm = { ...state.confirm }
    if (action.uid in state.confirm) {
      const newCalls = [...state.confirm[action.uid].calls]
      newCalls[action.callIndex] = {
        ...newCalls[action.callIndex],
        cancelled: true
      }
      newConfirm[action.uid] = {
        ...state.confirm[action.uid],
        calls: newCalls
      }
      newConfirm[action.uid].index = state.confirm[action.uid].index + 1
    } else {
      console.warn(
        'Programming error - cancel confirmation call action called with an invalid uid.'
      )
    }

    return {
      ...state,
      confirm: newConfirm
    }
  },
  [SET_CONFIRMATION_RESULT](state, action) {
    const newConfirm = { ...state.confirm }

    const newCalls = state.confirm[action.uid].calls
    newCalls[action.resultIndex ?? state.confirm[action.uid].index].result =
      action.result
    if (action.shouldIncrementConfirmGroupIndex) {
      newConfirm[action.uid].index = state.confirm[action.uid].index + 1
    }

    return {
      ...state,
      confirm: newConfirm
    }
  },
  [INCREMENT_CONFIRM_GROUP_INDEX](state, action) {
    const newConfirm = { ...state.confirm }
    newConfirm[action.uid].index = state.confirm[action.uid].index + 1

    return {
      ...state,
      confirm: newConfirm
    }
  },
  [ADD_COMPLETION_CALL](state, action) {
    const newComplete = { ...state.complete }
    if (action.uid in newComplete) {
      newComplete[action.uid].push(action.completionCall)
    } else {
      newComplete[action.uid] = [action.completionCall]
    }

    return {
      ...state,
      complete: newComplete
    }
  },
  [SET_OPERATION_SUCCESS_CALL](state, action) {
    const newComplete = { ...state.complete }
    const newOperationSuccessCallIdx = { ...state.operationSuccessCallIdx }
    if (
      action.uid in newOperationSuccessCallIdx &&
      action.operationId in newOperationSuccessCallIdx[action.uid]
    ) {
      const index = newOperationSuccessCallIdx[action.uid][action.operationId]
      newComplete[action.uid][index] = noop
      const newLength = newComplete[action.uid].push(action.completionCall)

      newOperationSuccessCallIdx[action.uid][action.operationId] = newLength - 1
    } else {
      let newLength: number
      if (action.uid in newComplete) {
        newLength = newComplete[action.uid].push(action.completionCall)
      } else {
        newComplete[action.uid] = [action.completionCall]
        newLength = 1
      }

      if (!(action.uid in newOperationSuccessCallIdx)) {
        newOperationSuccessCallIdx[action.uid] = {}
      }

      newOperationSuccessCallIdx[action.uid][action.operationId] = newLength - 1
    }

    return {
      ...state,
      operationSuccessCallIdx: newOperationSuccessCallIdx,
      complete: newComplete
    }
  },
  [CLEAR_CONFIRM](state, action) {
    const newConfirm = { ...state.confirm }
    delete newConfirm[action.uid]
    return {
      ...state,
      confirm: newConfirm
    }
  },
  [CLEAR_COMPLETE](state, action) {
    const newComplete = { ...state.complete }
    const newOperationSuccessCallIdx = { ...state.operationSuccessCallIdx }
    delete newOperationSuccessCallIdx[action.uid]

    if (
      action.index == null ||
      action.index + 1 > newComplete[action.uid].length - 1
    ) {
      delete newComplete[action.uid]
    } else {
      const newCompleteCalls = newComplete[action.uid].slice(action.index + 1)
      newComplete[action.uid] = newCompleteCalls
    }
    return {
      ...state,
      complete: newComplete,
      operationSuccessCallIdx: newOperationSuccessCallIdx
    }
  }
})

export default reducer
