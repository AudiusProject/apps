import { useSyncExternalStore } from 'react'

/**
 * Lazy access to the Reown AppKit singletons.
 *
 * `ReownAppKitModal` runs `new WagmiAdapter(...)`, `new SolanaAdapter()` and
 * `createAppKit(...)` at module scope, so a single static import anywhere in the
 * eager graph pins `@reown/appkit`, both adapters, `@walletconnect/*` and
 * `@solana/web3.js` into the entry chunk — for every visitor, including the
 * majority who never touch a wallet.
 *
 * Everything reaching AppKit from eagerly-loaded code should go through here
 * instead of importing `ReownAppKitModal` directly. Code that is already behind
 * a `React.lazy` boundary (wallet pages, wallet modals) can keep importing it
 * directly — those chunks are only fetched when the user gets there.
 */
type AppKitModule = typeof import('./ReownAppKitModal')

let loaded: AppKitModule | undefined
let pending: Promise<AppKitModule> | undefined
const listeners = new Set<() => void>()

/** Loads AppKit on demand. Memoized — concurrent callers share one import. */
export const loadAppKit = (): Promise<AppKitModule> => {
  if (loaded) return Promise.resolve(loaded)
  if (!pending) {
    pending = import('./ReownAppKitModal').then((mod) => {
      loaded = mod
      listeners.forEach((notify) => notify())
      return mod
    })
  }
  return pending
}

/**
 * The AppKit module if it has already loaded, else `undefined`. Never triggers
 * a load — for callers that only need to act on an *existing* connection (e.g.
 * disconnect on sign-out: if AppKit never loaded there is nothing to disconnect).
 */
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
 * Whether this browser has a persisted external-wallet connection, i.e. whether
 * AppKit needs to load at startup to restore it.
 *
 * Deliberately biased toward `true`. A false negative silently downgrades an
 * external-wallet user to Hedgehog, which is a correctness bug; a false positive
 * only costs an unnecessary chunk load. When the key is present but unreadable
 * we load AppKit and let wagmi decide.
 */
export const hasPersistedWalletConnection = (): boolean => {
  let raw: string | null = null
  try {
    raw = window.localStorage.getItem(WAGMI_STORAGE_KEY)
  } catch {
    // localStorage unavailable (SSR, private mode). Nothing could have been
    // persisted, so there is no connection to restore.
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
