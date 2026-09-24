import { toastActions } from '@audius/common/store'
import { takeEvery, put } from 'redux-saga/effects'

import * as errorActions from './actions'
const { toast } = toastActions

function* handleError(action: errorActions.HandleErrorAction) {
  console.debug(`Handling error: ${action.message}`)
  if (action.shouldReport) {
    console.error(action.name ?? 'Error', action.message, action.additionalInfo)
  }

  // Toast error at the top of the page
  if (action.shouldToast) {
    yield put(toast({ content: action.message }))
  }

  // Show full screen Something Wrong error, requiring full app refresh/restart
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
