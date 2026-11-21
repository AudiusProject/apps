import { takeEvery, put, call } from 'typed-redux-saga'

import { Name } from '~/models/Analytics'
import { getContext } from '~/store/effects'

import { setVisibility } from '../modals/parentSlice'

import { requestOpen } from './slice'

function* handleRequestOpen({ payload }: ReturnType<typeof requestOpen>) {
  yield put(setVisibility({ modal: 'Share', visible: true }))

  const { source, type, ...ids } = payload
  const { track, make } = yield* getContext('analytics')
  yield* call(
    track,
    make({
      eventName: Name.MODAL_OPENED,
      name: 'Share',
      source,
      kind: type,
      ...ids
    })
  )
}

function* watchHandleRequestOpen() {
  yield takeEvery(requestOpen, handleRequestOpen)
}

export default function sagas() {
  return [watchHandleRequestOpen]
}
