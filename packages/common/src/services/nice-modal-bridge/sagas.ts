import { takeEvery, call } from 'typed-redux-saga'

import { setVisibility } from '~/store/ui/modals/parentSlice'

import {
  hideNiceModal,
  isNiceModalId,
  showNiceModal
} from './index'

/**
 * Bridge saga: translates legacy redux-driven `setVisibility(id, true|false)`
 * actions into `showNiceModal(id)` / `hideNiceModal(id)` for any modal id
 * that has registered itself via `registerNiceModalId(...)`.
 *
 * This lets NiceModal-managed modals coexist with the legacy modal registry
 * — every existing trigger site that dispatches `setVisibility` keeps
 * working unchanged, and migrating a modal to NiceModal becomes:
 *   1. Wrap with `NiceModal.create(...)`
 *   2. `NiceModal.register('X', Component)`
 *   3. `registerNiceModalId('X')`
 *   4. Add a side-effect import to `registerNiceModals.ts`
 *   5. Remove from web `Modals.tsx` / mobile `Drawers.tsx` (avoid double-mount)
 *
 * Once every caller has been moved to call `showNiceModal` directly, this
 * bridge can be deleted.
 */
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

export default function niceModalBridgeSagas() {
  return [watchOpenViaSetVisibility]
}
