/**
 * Platform-agnostic bridge to nice-modal-react.
 *
 * The web and mobile apps install `@ebay/nice-modal-react` and call
 * `setNiceModalAdapter({ show, hide })` at app init. Code in `common`
 * (sagas, services) calls `showNiceModal(id, props)` / `hideNiceModal(id)`
 * to drive nice-modal-react without taking a direct dependency on it.
 *
 * If a caller fires `showNiceModal` before the adapter is registered
 * (e.g. during early app boot or in a test), the call is logged and
 * resolves with `undefined` rather than throwing.
 */

export type NiceModalShowFn = (
  id: string,
  props?: Record<string, unknown>
) => Promise<unknown>

export type NiceModalHideFn = (id: string) => Promise<unknown>

type NiceModalAdapter = {
  show: NiceModalShowFn
  hide: NiceModalHideFn
}

let adapter: NiceModalAdapter | null = null

export const setNiceModalAdapter = (next: NiceModalAdapter) => {
  adapter = next
}

export const showNiceModal: NiceModalShowFn = (id, props) => {
  if (!adapter) {
    console.warn(
      `[nice-modal-bridge] showNiceModal('${id}') called before adapter init`
    )
    return Promise.resolve()
  }
  return adapter.show(id, props)
}

export const hideNiceModal: NiceModalHideFn = (id) => {
  if (!adapter) {
    console.warn(
      `[nice-modal-bridge] hideNiceModal('${id}') called before adapter init`
    )
    return Promise.resolve()
  }
  return adapter.hide(id)
}
