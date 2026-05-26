import { takeEvery, put } from 'typed-redux-saga'

import { setVisibility } from '../modals/parentSlice'

import { requestOpen } from './slice'

// The previous saga fetched track/user/collection data before opening the
// modal. That work now lives in `useShareContent` so the modal loads its own
// data via TanStack Query. All that remains is to flip the nice-modal
// visibility once a share request lands in the slice.
function* handleRequestOpen() {
  yield put(setVisibility({ modal: 'Share', visible: true }))
}

function* watchHandleRequestOpen() {
  yield takeEvery(requestOpen, handleRequestOpen)
}

export default function sagas() {
  return [watchHandleRequestOpen]
}
