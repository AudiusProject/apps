import { make } from 'common/store/analytics/actions'
import { SIGN_UP_SUCCEEDED } from 'common/store/pages/signon/actions'
import {
  getEmailField,
  getHandleField
} from 'common/store/pages/signon/selectors'
import { takeEvery, put, select } from 'typed-redux-saga'

import { EventNames } from 'app/types/analytics'

export function* watchSignUpSucceeded() {
  yield* takeEvery(SIGN_UP_SUCCEEDED, handleSignUpSucceeded)
}

function* handleSignUpSucceeded() {
  const emailField = yield* select(getEmailField)
  const handleField = yield* select(getHandleField)

  yield put(
    make(EventNames.CREATE_ACCOUNT_COMPLETE_CREATING, {
      emailAddress: emailField.value,
      handle: handleField.value
    })
  )
}
