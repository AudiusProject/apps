import { Action } from '@reduxjs/toolkit'
import { takeEvery as untypedTakeEvery } from 'redux-saga/effects'
import { takeEvery, call } from 'typed-redux-saga'

import { setVisibility } from '~/store/ui/modals/parentSlice'

import { hideNiceModal, isNiceModalId, showNiceModal } from './index'

const CREATE_MODAL_ACTION_RE = /^modals\/(.+)\/(open|close|closed)$/

function* watchOpenViaSetVisibility() {
  yield takeEvery(
    setVisibility,
    function* (action: ReturnType<typeof setVisibility>) {
      const { modal, visible } = action.payload
      if (!isNiceModalId(modal)) return
      if (visible === true) {
        yield call(showNiceModal, modal)
      } else if (visible === false) {
        yield call(hideNiceModal, modal)
      }
      // 'closing' is a transient state used by the legacy AppDrawer for
      // its close animation; ignore it here — NiceModal handles its own
      // exit animation.
    }
  )
}

function* watchOpenViaCreateModal() {
  yield untypedTakeEvery('*', function* (action: Action) {
    if (typeof action?.type !== 'string') return
    const match = action.type.match(CREATE_MODAL_ACTION_RE)
    if (!match) return
    const [, modalId, kind] = match
    if (!isNiceModalId(modalId)) return
    if (kind === 'open') {
      yield call(showNiceModal, modalId)
    } else {
      yield call(hideNiceModal, modalId)
    }
  })
}

export default function niceModalBridgeSagas() {
  return [watchOpenViaSetVisibility, watchOpenViaCreateModal]
}
