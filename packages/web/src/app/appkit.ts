import { useSyncExternalStore } from 'react'

/**
 * Lazy access to ReownAppKitModal, which creates AppKit and its adapters at
 * module scope. Eagerly loaded code must go through here so the wallet SDKs
 * stay out of the entry chunk.
 */
type AppKitModule = Pick<
  typeof import('./ReownAppKitModal'),
  'appkitModal' | 'wagmiAdapter'
>

let loaded: AppKitModule | undefined
let pending: Promise<AppKitModule> | undefined
const listeners = new Set<() => void>()

/**
 * Called by ReownAppKitModal when it is evaluated, so a direct static import
 * (from an already-lazy chunk) is tracked the same as loadAppKit().
 */
export const registerLoadedAppKit = (mod: AppKitModule) => {
  if (loaded) return
  loaded = mod
  listeners.forEach((notify) => notify())
}

/** Loads AppKit on demand. Concurrent callers share one import. */
export const loadAppKit = (): Promise<AppKitModule> => {
  if (loaded) return Promise.resolve(loaded)
  if (!pending) {
    pending = import('./ReownAppKitModal').then(
      (mod) => {
        registerLoadedAppKit(mod)
        return mod
      },
      (error) => {
        // Allow a retry after a failed chunk load
        pending = undefined
        throw error
      }
    )
  }
  return pending
}

/** The AppKit module if it has already loaded. Never triggers a load. */
export const getLoadedAppKit = (): AppKitModule | undefined => loaded

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

const getServerSnapshot = (): AppKitModule | undefined => undefined

/** React binding for {@link getLoadedAppKit}; re-renders once AppKit loads. */
export const useLoadedAppKit = (): AppKitModule | undefined =>
  useSyncExternalStore(subscribe, getLoadedAppKit, getServerSnapshot)

/**
 * wagmi's default storage key. `WagmiAdapter` passes no `storage` override, so
 * `@wagmi/core`'s `createStorage` falls back to the `wagmi` prefix.
 */
const WAGMI_STORAGE_KEY = 'wagmi.store'

/**
 * Whether this browser has a persisted external-wallet connection. Returns
 * true when the stored value can't be parsed, since a false negative would
 * drop an external-wallet user to Hedgehog.
 */
export const hasPersistedWalletConnection = (): boolean => {
  let raw: string | null = null
  try {
    raw = window.localStorage.getItem(WAGMI_STORAGE_KEY)
  } catch {
    // localStorage unavailable (SSR, private mode)
    return false
  }
  if (!raw) return false
  try {
    const { state } = JSON.parse(raw) ?? {}
    if (!state) return true
    // wagmi serializes `connections` as { __type: 'Map', value: [...] }.
    const connections = state.connections?.value ?? state.connections
    const count = Array.isArray(connections) ? connections.length : 0
    return Boolean(state.current) || count > 0
  } catch {
    return true
  }
}
