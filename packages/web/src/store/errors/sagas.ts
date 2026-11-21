import { toastActions } from '@audius/common/store'
import { takeEvery, put } from 'redux-saga/effects'

import * as errorActions from './actions'
const { toast } = toastActions

function* handleError(action: errorActions.HandleErrorAction) {
  console.debug(`Handling error: ${action.message}`)
  if (action.shouldReport) {
    console.error(action.name ?? 'Error', action.message, action.additionalInfo)
  }

  if (action.shouldToast) {
    yield put(toast({ content: action.message }))
  }

  if (action.shouldRedirect) {
    yield put(errorActions.openErrorPage())
  }
}

function* watchHandleError() {
  yield takeEvery(errorActions.HANDLE_ERROR, handleError)
}

export default function sagas() {
  return [watchHandleError]
}
