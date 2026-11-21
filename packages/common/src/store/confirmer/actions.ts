import { createCustomAction } from 'typesafe-actions'

import { ConfirmationOptions, RequestConfirmationError } from './types'

export const REQUEST_CONFIRMATION = 'CONFIRMER/REQUEST_CONFIRMATION'

export const ADD_CONFIRMATION_CALL = 'CONFIRMER/ADD_CONFIRMATION_CALL'
export const CANCEL_CONFIRMATION_CALL = 'CONFIRMER/CANCEL_CONFIRMATION_CALL'
export const SET_CONFIRMATION_RESULT = 'CONFIRMER/SET_CONFIRMATION_RESULT'
export const ADD_COMPLETION_CALL = 'CONFIRMER/ADD_COMPLETION_CALL'
export const SET_OPERATION_SUCCESS_CALL = 'CONFIRMER/SET_OPERATION_SUCCESS_CALL'

export const INCREMENT_CONFIRM_GROUP_INDEX =
  'CONFIRMER/INCREMENT_CONFIRM_GROUP_INDEX'

export const CLEAR_CONFIRM = 'CONFIRMER/CLEAR_CONFIRM'
export const CLEAR_COMPLETE = 'CONFIRMER/CLEAR_COMPLETE'

const DEFAULT_TIMEOUT = 10 * 60 * 1000

const validateConfirmationOptions = ({
  operationId,
  squashable,
  parallelizable,
  useOnlyLastSuccessCall
}: ConfirmationOptions) => {
  if (
    (squashable === true ||
      parallelizable === true ||
      useOnlyLastSuccessCall === true) &&
    operationId == null
  ) {
    throw new Error(
      'Programming error - must pass `operationId` in confirmation options if `squashable` or `parallelizable` or `useOnlyLastSuccessCall` is also passed.'
    )
  }
  if (parallelizable === true && squashable === true) {
    throw new Error(
      'Programming error - only one of `parallelizable` or `squashable` can be true in confirmation options'
    )
  }
}

export const requestConfirmation = createCustomAction(
  REQUEST_CONFIRMATION,
  (
    uid: string,
    confirmationCall: any,
    successCall: any = function* () {},
    failCall: (
      _params: RequestConfirmationError
    ) => Generator = function* () {},
    previousResultSelector: any = () => {},
    timeoutMillis = DEFAULT_TIMEOUT,
    confirmationOptions: ConfirmationOptions = {}
  ) => {
    validateConfirmationOptions(confirmationOptions)
    return {
      type: REQUEST_CONFIRMATION,
      uid,
      confirmationCall,
      successCall,
      failCall,
      previousResultSelector,
      timeoutMillis,
      confirmationOptions
    }
  }
)

export const _addConfirmationCall = createCustomAction(
  ADD_CONFIRMATION_CALL,
  (
    uid: string,
    confirmationCall: any,
    confirmationOptions: ConfirmationOptions = {}
  ) => {
    return {
      type: ADD_CONFIRMATION_CALL,
      uid,
      confirmationCall,
      confirmationOptions
    }
  }
)

export const _incrementConfirmGroupIndex = createCustomAction(
  INCREMENT_CONFIRM_GROUP_INDEX,
  (uid: string) => {
    return {
      type: INCREMENT_CONFIRM_GROUP_INDEX,
      uid
    }
  }
)

export const _setConfirmationResult = createCustomAction(
  SET_CONFIRMATION_RESULT,
  (
    uid: string,
    result: unknown,
    resultIndex?: number,
    shouldIncrementConfirmGroupIndex = true
  ) => {
    return {
      type: SET_CONFIRMATION_RESULT,
      uid,
      result,
      resultIndex,
      shouldIncrementConfirmGroupIndex
    }
  }
)

export const _addCompletionCall = createCustomAction(
  ADD_COMPLETION_CALL,
  (uid: string, completionCall: any) => {
    return { type: ADD_COMPLETION_CALL, uid, completionCall }
  }
)

export const _setOperationSuccessCall = createCustomAction(
  SET_OPERATION_SUCCESS_CALL,
  (uid: string, operationId: string, completionCall: any) => {
    return {
      type: SET_OPERATION_SUCCESS_CALL,
      uid,
      operationId,
      completionCall
    }
  }
)

export const _cancelConfirmationCall = createCustomAction(
  CANCEL_CONFIRMATION_CALL,
  (uid: string, callIndex: number) => {
    return { type: CANCEL_CONFIRMATION_CALL, uid, callIndex }
  }
)

export const _clearComplete = createCustomAction(
  CLEAR_COMPLETE,
  (uid: string, index?: number) => {
    return { type: CLEAR_COMPLETE, uid, index }
  }
)

export const _clearConfirm = createCustomAction(
  CLEAR_CONFIRM,
  (uid: string) => {
    return { type: CLEAR_CONFIRM, uid }
  }
)
