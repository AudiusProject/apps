import { Action } from '@reduxjs/toolkit'
import { takeEvery as untypedTakeEvery } from 'redux-saga/effects'
import { takeEvery, call } from 'typed-redux-saga'

import { setVisibility } from '~/store/ui/modals/parentSlice'

import { hideNiceModal, isNiceModalId, showNiceModal } from './index'

/**
 * Bridge saga: translates legacy redux-driven modal trigger actions into
 * `showNiceModal(id)` / `hideNiceModal(id)` for any modal id that has
 * registered itself via `registerNiceModalId(...)`.
 *
 * Two trigger shapes need to bridge:
 *
 *   1. `parentSlice.setVisibility({ modal, visible })` — used by hand-written
 *      trigger sites that dispatch directly against the parent registry.
 *
 *   2. `modals/{reducerPath}/open` — emitted by the per-modal hooks created
 *      by `createModal()`. e.g. `useLeavingAudiusModal().onOpen({ link })`
 *      dispatches `modals/LeavingAudiusModal/open`. We watch this generic
 *      action shape so createModal-driven modals migrate without editing
 *      every trigger site.
 *
 * This lets NiceModal-managed modals coexist with the legacy modal registry
 * — every existing trigger site keeps working unchanged, and migrating a
 * modal to NiceModal becomes:
 *   1. Wrap with `NiceModal.create(...)`
 *   2. `NiceModal.register('X', Component)` + `registerNiceModalId('X')`
 *   3. Side-effect import in `registerNiceModals.ts`
 *   4. Remove from web `Modals.tsx` / mobile `Drawers.tsx` (avoid double-mount)
 *
 * Once every caller has been moved to call `showNiceModal` directly, this
 * bridge can be deleted.
 */

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
  // Match every action and filter inside. We use plain redux-saga's
  // `takeEvery('*', ...)` here because typed-redux-saga's takeEvery typings
  // and runtime path don't reliably accept the wildcard pattern.
  yield untypedTakeEvery('*', function* (action: Action) {
    if (typeof action?.type !== 'string') return
    const match = action.type.match(CREATE_MODAL_ACTION_RE)
    if (!match) return
    const [, modalId, kind] = match
    if (!isNiceModalId(modalId)) return
    if (kind === 'open') {
      yield call(showNiceModal, modalId)
    } else {
      // 'close' / 'closed' — NiceModal owns its own exit animation, so
      // just hide. modal.remove() is called automatically.
      yield call(hideNiceModal, modalId)
    }
  })
}

export default function niceModalBridgeSagas() {
  return [watchOpenViaSetVisibility, watchOpenViaCreateModal]
}
