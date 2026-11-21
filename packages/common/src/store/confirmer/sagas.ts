import { call, delay, put, race, select, takeEvery } from 'redux-saga/effects'

import { waitForValue } from '~/utils/sagaHelpers'

import * as confirmerActions from './actions'
import {
  getResult,
  getCommandChain,
  getIndexEquals,
  getConfirmLength,
  getIsDone,
  getLatestResult,
  getShouldCancelCurrentCall,
  getAreRequisiteCallsComplete
} from './selectors'
import type { RequestConfirmationError } from './types'

function* requestConfirmationAsync(
  action: ReturnType<typeof confirmerActions.requestConfirmation>
) {
  const {
    uid,
    confirmationCall,
    successCall,
    failCall,
    previousResultSelector,
    timeoutMillis,
    confirmationOptions
  } = action
  const { parallelizable, useOnlyLastSuccessCall, operationId } =
    confirmationOptions

  const nextCallIndex: number = yield select(getConfirmLength, { uid })
  yield put(
    confirmerActions._addConfirmationCall(
      uid,
      confirmationCall,
      confirmationOptions
    )
  )

  yield call(waitForValue, getIndexEquals, { uid, index: nextCallIndex })
  yield call(waitForValue, getAreRequisiteCallsComplete, {
    uid,
    index: nextCallIndex
  })
  let result, completionCall, success
  const shouldCancelCurrentCall: boolean | undefined = yield select(
    getShouldCancelCurrentCall,
    { uid }
  )

  if (shouldCancelCurrentCall) {
    yield put(confirmerActions._cancelConfirmationCall(uid, nextCallIndex))
  } else {
    let previousCallResult: unknown
    if (parallelizable) {
      previousCallResult = yield select(getLatestResult, { uid })
    } else {
      previousCallResult = yield call(waitForValue, getResult, {
        uid,
        index: nextCallIndex - 1
      })
    }
    try {
      if (parallelizable) {
        yield put(confirmerActions._incrementConfirmGroupIndex(uid))
      }
      const { confirmationResult, timeout } = yield race({
        confirmationResult: call(
          confirmationCall,
          previousResultSelector(previousCallResult)
        ),
        timeout: delay(timeoutMillis, true)
      })
      if (!timeout) {
        result = confirmationResult
        success = true
        completionCall = successCall
      } else {
        result = {
          error: new Error('Confirmation timed out'),
          timeout: true
        } as RequestConfirmationError
        success = false
        completionCall = failCall
      }
    } catch (err) {
      console.error('Caught error in confirmer:', err)
      result = {
        error: err,
        message: err instanceof Error ? err.message : '',
        timeout: false
      } as RequestConfirmationError
      success = false
      completionCall = failCall
    }

    yield put(
      confirmerActions._setConfirmationResult(
        uid,
        result,
        nextCallIndex,
        !parallelizable
      )
    )
    if (success && useOnlyLastSuccessCall && operationId) {
      yield put(
        confirmerActions._setOperationSuccessCall(
          uid,
          operationId,
          call(completionCall, result)
        )
      )
    } else {
      yield put(
        confirmerActions._addCompletionCall(uid, call(completionCall, result))
      )
    }

    const isDone: boolean = yield select(getIsDone, { uid })
    if (isDone) {
      const commandChain: any[] = yield select(getCommandChain, { uid })
      for (let i = 0; i < commandChain.length; ++i) {
        if (commandChain[i]) {
          yield commandChain[i]
        }
      }
      yield put(confirmerActions._clearComplete(uid, commandChain.length - 1))

      const isStillDone: boolean = yield select(getIsDone, { uid })
      if (isStillDone) {
        yield put(confirmerActions._clearConfirm(uid))
      }
    }
  }
}

export function* watchRequestConfirmation() {
  yield takeEvery(
    confirmerActions.REQUEST_CONFIRMATION,
    requestConfirmationAsync
  )
}

export default function sagas() {
  return [watchRequestConfirmation]
}
