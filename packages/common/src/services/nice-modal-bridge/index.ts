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

const niceModalIds = new Set<string>()

export const registerNiceModalId = (id: string) => {
  niceModalIds.add(id)
}

export const isNiceModalId = (id: string): boolean => niceModalIds.has(id)

export { default as niceModalBridgeSagas } from './sagas'
