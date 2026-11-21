import { useSyncExternalStore } from 'react'

type AppKitModule = Pick<
  typeof import('./ReownAppKitModal'),
  'appkitModal' | 'wagmiAdapter'
>

let loaded: AppKitModule | undefined
let pending: Promise<AppKitModule> | undefined
const listeners = new Set<() => void>()

export const registerLoadedAppKit = (mod: AppKitModule) => {
  if (loaded) return
  loaded = mod
  listeners.forEach((notify) => notify())
}

export const loadAppKit = (): Promise<AppKitModule> => {
  if (loaded) return Promise.resolve(loaded)
  if (!pending) {
    pending = import('./ReownAppKitModal').then(
      (mod) => {
        registerLoadedAppKit(mod)
        return mod
      },
      (error) => {
        pending = undefined
        throw error
      }
    )
  }
  return pending
}

export const getLoadedAppKit = (): AppKitModule | undefined => loaded

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

const getServerSnapshot = (): AppKitModule | undefined => undefined

export const useLoadedAppKit = (): AppKitModule | undefined =>
  useSyncExternalStore(subscribe, getLoadedAppKit, getServerSnapshot)

const WAGMI_STORAGE_KEY = 'wagmi.store'

export const hasPersistedWalletConnection = (): boolean => {
  let raw: string | null = null
  try {
    raw = window.localStorage.getItem(WAGMI_STORAGE_KEY)
  } catch {
    return false
  }
  if (!raw) return false
  try {
    const { state } = JSON.parse(raw) ?? {}
    if (!state) return true
    const connections = state.connections?.value ?? state.connections
    const count = Array.isArray(connections) ? connections.length : 0
    return Boolean(state.current) || count > 0
  } catch {
    return true
  }
}
