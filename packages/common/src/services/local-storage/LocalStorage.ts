import { CachedAccount, User, UserMetadata } from '~/models/User'
import { PLAYBACK_RATE_LS_KEY } from '~/store/index'

import { Nullable } from '../../utils'

import {
  AUDIUS_ACCOUNT_KEY,
  AUDIUS_ACCOUNT_USER_KEY,
  AUDIUS_USER_WALLET_OVERRIDE_KEY
} from './constants'

type LocalStorageType = {
  getItem: (key: string) => Promise<string | null> | string | null
  setItem: (key: string, value: string) => Promise<void> | void
  removeItem: (key: string) => Promise<void> | void
}

type LocalStorageConfig = {
  localStorage: LocalStorageType
}

export class LocalStorage {
  localStorage: LocalStorageType
  // In-memory mirror of select keys so getItemSync returns real values on
  // platforms where the underlying storage is async (AsyncStorage on RN).
  // Web's localStorage is sync, so the cache layer is a no-op there.
  private syncCache: Map<string, string | null> = new Map()

  constructor(config: LocalStorageConfig) {
    this.localStorage = config.localStorage
  }

  /**
   * Pre-populate the sync cache for keys we need to read synchronously
   * during first render (e.g. account/user used by `useCurrentAccount`'s
   * placeholderData). Call once at app boot before mounting React.
   */
  preloadSyncKeys = async (keys: string[]) => {
    const values = await Promise.all(keys.map((k) => this.getItem(k)))
    keys.forEach((k, i) => this.syncCache.set(k, values[i] ?? null))
  }

  /**
   * Convenience: preload the keys read by `useCurrentAccount.placeholderData`
   * so the placeholder returns real data on first render. Required on RN
   * where the underlying AsyncStorage is async.
   */
  preloadAccountSyncCache = () =>
    this.preloadSyncKeys([AUDIUS_ACCOUNT_KEY, AUDIUS_ACCOUNT_USER_KEY])

  getItem = async (key: string) => {
    return await this.localStorage.getItem(key)
  }

  getItemSync = (key: string) => {
    if (this.syncCache.has(key)) {
      return this.syncCache.get(key) ?? null
    }
    // Web's localStorage.getItem is sync; AsyncStorage's is a Promise. The
    // Promise case is handled by callers preloading the key first — return
    // null when we can't honor a synchronous read.
    const v = this.localStorage.getItem(key)
    return typeof v === 'string' || v === null ? v : null
  }

  getValue = async (key: string) => {
    return await this.localStorage.getItem(key)
  }

  async getJSONValue<T>(key: string): Promise<T | null> {
    const val = await this.getValue(key)
    if (val) {
      try {
        const parsed = JSON.parse(val)
        return parsed
      } catch (e) {
        return null
      }
    }
    return null
  }

  getJSONValueSync = <T>(key: string): T | null => {
    const val = this.getItemSync(key) as string | null
    if (val) {
      try {
        const parsed = JSON.parse(val)
        return parsed
      } catch (e) {
        return null
      }
    }
    return null
  }

  async getExpiringJSONValue<T>(key: string): Promise<T | null> {
    const res: Nullable<{ value: T; expiry: number }> =
      await this.getJSONValue(key)
    if (!res) {
      return null
    }

    const isExpired = res.expiry < Date.now()
    if (isExpired) {
      this.localStorage.removeItem(key)
      return null
    }

    return res.value
  }

  setItem = async (key: string, value: string) => {
    if (this.syncCache.has(key)) this.syncCache.set(key, value)
    return await this.localStorage.setItem(key, value)
  }

  setValue = async (key: string, value: string) => {
    if (this.syncCache.has(key)) this.syncCache.set(key, value)
    return await this.localStorage.setItem(key, value)
  }

  async setJSONValue(key: string, value: any) {
    const string = JSON.stringify(value)
    await this.setValue(key, string)
  }

  setExpiringJSONValue<T>(key: string, value: T, ttlSeconds: number) {
    const expiring = {
      value,
      expiry: Date.now() + ttlSeconds * 1000
    }
    if (this.syncCache.has(key)) {
      this.syncCache.set(key, JSON.stringify(expiring))
    }
    this.localStorage.setItem(key, JSON.stringify(expiring))
  }

  async removeItem(key: string) {
    if (this.syncCache.has(key)) this.syncCache.set(key, null)
    await this.localStorage.removeItem(key)
  }

  getAudiusAccount = async (): Promise<CachedAccount | null> =>
    this.getJSONValue(AUDIUS_ACCOUNT_KEY)

  getAudiusAccountSync = (): CachedAccount | null =>
    this.getJSONValueSync(AUDIUS_ACCOUNT_KEY)

  setAudiusAccount = async (value: object) => {
    await this.setJSONValue(AUDIUS_ACCOUNT_KEY, value)
  }

  clearAudiusUserWalletOverride = async () =>
    this.removeItem(AUDIUS_USER_WALLET_OVERRIDE_KEY)

  getAudiusUserWalletOverride = async () =>
    this.getValue(AUDIUS_USER_WALLET_OVERRIDE_KEY)

  setAudiusUserWalletOverride = async (value: string) =>
    this.setValue(AUDIUS_USER_WALLET_OVERRIDE_KEY, value)

  clearAudiusAccount = async () => this.removeItem(AUDIUS_ACCOUNT_KEY)

  getAudiusAccountUser = async (): Promise<User | null> =>
    this.getJSONValue(AUDIUS_ACCOUNT_USER_KEY)

  getAudiusAccountUserSync = (): User | null =>
    this.getJSONValueSync(AUDIUS_ACCOUNT_USER_KEY)

  setAudiusAccountUser = async (value: UserMetadata) =>
    this.setJSONValue(AUDIUS_ACCOUNT_USER_KEY, value)

  clearAudiusAccountUser = async () => this.removeItem(AUDIUS_ACCOUNT_USER_KEY)

  clearPlaybackRate = async () => this.removeItem(PLAYBACK_RATE_LS_KEY)
}
