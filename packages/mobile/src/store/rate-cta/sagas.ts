import { waitForWrite } from '@audius/web/src/utils/sagaHelpers'
import { call, put, takeEvery } from 'typed-redux-saga'

import { setVisibility } from '../drawers/slice'

import { requestReview } from './slice'

function* displayRequestReviewDrawer() {
  yield* call(waitForWrite)
  yield put(setVisibility({ drawer: 'RateCallToAction', visible: true }))
}

function* watchRequestReview() {
  yield* takeEvery(requestReview.type, displayRequestReviewDrawer)
}

export default function sagas() {
  return [watchRequestReview]
}
