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

  constructor(config: LocalStorageConfig) {
    this.localStorage = config.localStorage
  }

  getItem = async (key: string) => {
    return await this.localStorage.getItem(key)
  }

  getItemSync = (key: string) => {
    return this.localStorage.getItem(key)
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
    return await this.localStorage.setItem(key, value)
  }

  setValue = async (key: string, value: string) => {
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
    this.localStorage.setItem(key, JSON.stringify(expiring))
  }

  async removeItem(key: string) {
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
