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

const DEFAULT_TIMEOUT = 10 /* min */ * 60 /* sec */ * 1000 /* ms */

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

/**
 * Requests a confirmation of the result of an async call, dispatching success on completion or failure on timeout.
 * Should not be dispatched via UI, but rather a Saga/service/middleware.
 *
 * Confirmations with the same uid chain together and form a `confirm group`.
 * For example, if the following actions are dispatched in rapid succession:
 *  1. Create playlist
 *  2. Change playlist name
 *  3. Change playlist description
 * The calls are fired in order in such a way that each call makes use the result of the previous call's return value.
 * Additionally, calls within a confirm group can be further categorized using
 * an `operationId`. Using the `confirmationOptions` param object, the requester can specify that calls of a particular `operationId`
 * may be parallelized or squashed (where only the last call is necessary to resolve)
 * for performance gains. The requester may also specify to only invoke the success callback of the
 * last call of a particular `operationId` to resolve.
 *
 * TODO:
 *  - consider retries/timeout backoff
 *  - consider other mechanisms for failure other than timeout
 *
 * @param uid (string) A unique identifier for this confirmation (e.g. track id)
 * @param confirmationCall (function * | async function) The confirmation call to make. Can optionally receive the previous
 *  confirmation's result.
 * @param successCall (function * | async function | any An optional async call to make on success.
 *  It is invoked with the return value of the confirmation call.
 * @param failCall (function * | ?async function | any An optional async call to make on failure.
 * @param previousResultSelector (function) A selector to select content from the previous confirmation to pass to this one.
 * @param timeoutMillis (number) The millisecond timeout to await confirmation for
 * @param confirmationOptions ConfirmationOptions object - see type documentation for details.
 */
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

/* Private */

/** Enqueues a confirmation call to make, e.g. "create playlist with a temp id, wait for playlist to appear in API response"." */
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

/** Increment the index of a confirm group with given uid. */
export const _incrementConfirmGroupIndex = createCustomAction(
  INCREMENT_CONFIRM_GROUP_INDEX,
  (uid: string) => {
    return {
      type: INCREMENT_CONFIRM_GROUP_INDEX,
      uid
    }
  }
)

/**
 * Sets the result of a confirmation call, e.g. "save the discprov's returned playlist id"
 * @param uid confirm group uid
 * @param result Result of the confirmation call
 * @param resultIndex (optional) index of the call whose result we want to set. If undefined, defaults to the current index
 * of the confirm group.
 * @param shouldIncrementConfirmGroupIndex Whether to increment the `index` field of the confirm group
 * (which denotes the index of the upcoming/current call to be processed). This should be set to `false`
 * if the index was already incremented before calling `setConfirmationResult`, as in the case of a parallelizable call.
 *  */
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

/** Enqueues a completion call to make, e.g. "cache the playlist" */
export const _addCompletionCall = createCustomAction(
  ADD_COMPLETION_CALL,
  (uid: string, completionCall: any) => {
    return { type: ADD_COMPLETION_CALL, uid, completionCall }
  }
)

/** Enqueues a success call for a given operation id and cancels the previously enqueued one.
 */
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

/** Cancels a pending confirmation call */
export const _cancelConfirmationCall = createCustomAction(
  CANCEL_CONFIRMATION_CALL,
  (uid: string, callIndex: number) => {
    return { type: CANCEL_CONFIRMATION_CALL, uid, callIndex }
  }
)

/** Clears completion calls for given `uid` up to (and including) `index`. If `index` is undefined, clears all completion calls. */
export const _clearComplete = createCustomAction(
  CLEAR_COMPLETE,
  (uid: string, index?: number) => {
    return { type: CLEAR_COMPLETE, uid, index }
  }
)

/** Clears the queue for a given uid */
export const _clearConfirm = createCustomAction(
  CLEAR_CONFIRM,
  (uid: string) => {
    return { type: CLEAR_CONFIRM, uid }
  }
)
