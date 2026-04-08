import AsyncStorage from '@react-native-async-storage/async-storage'

import type { OAuthTokenStore } from './tokenStore'

const AS_ACCESS_TOKEN_KEY = 'audius_access_token'
const AS_REFRESH_TOKEN_KEY = 'audius_refresh_token'
const AS_ACCESS_TOKEN_EXPIRY_KEY = 'audius_access_token_expiry'
const AS_REFRESH_TOKEN_EXPIRY_KEY = 'audius_refresh_token_expiry'

export class TokenStoreAsyncStorage implements OAuthTokenStore {
  getAccessToken(): Promise<string | null> {
    return AsyncStorage.getItem(AS_ACCESS_TOKEN_KEY)
  }

  getRefreshToken(): Promise<string | null> {
    return AsyncStorage.getItem(AS_REFRESH_TOKEN_KEY)
  }

  async getAccessTokenExpiry(): Promise<number | null> {
    const raw = await AsyncStorage.getItem(AS_ACCESS_TOKEN_EXPIRY_KEY)
    if (raw == null) return null
    const n = Number(raw)
    return Number.isFinite(n) ? n : null
  }

  async getRefreshTokenExpiry(): Promise<number | null> {
    const raw = await AsyncStorage.getItem(AS_REFRESH_TOKEN_EXPIRY_KEY)
    if (raw == null) return null
    const n = Number(raw)
    return Number.isFinite(n) ? n : null
  }

  async setTokens(
    access: string,
    refresh: string,
    expiresIn?: number,
    refreshExpiresIn?: number
  ): Promise<void> {
    const ops: Array<Promise<void>> = [
      AsyncStorage.setItem(AS_ACCESS_TOKEN_KEY, access),
      AsyncStorage.setItem(AS_REFRESH_TOKEN_KEY, refresh)
    ]
    if (expiresIn != null) {
      ops.push(
        AsyncStorage.setItem(
          AS_ACCESS_TOKEN_EXPIRY_KEY,
          String(Date.now() + expiresIn * 1000)
        )
      )
    } else {
      ops.push(AsyncStorage.removeItem(AS_ACCESS_TOKEN_EXPIRY_KEY))
    }
    if (refreshExpiresIn != null) {
      ops.push(
        AsyncStorage.setItem(
          AS_REFRESH_TOKEN_EXPIRY_KEY,
          String(Date.now() + refreshExpiresIn * 1000)
        )
      )
    } else {
      ops.push(AsyncStorage.removeItem(AS_REFRESH_TOKEN_EXPIRY_KEY))
    }
    await Promise.all(ops)
  }

  async clear(): Promise<void> {
    await Promise.all([
      AsyncStorage.removeItem(AS_ACCESS_TOKEN_KEY),
      AsyncStorage.removeItem(AS_REFRESH_TOKEN_KEY),
      AsyncStorage.removeItem(AS_ACCESS_TOKEN_EXPIRY_KEY),
      AsyncStorage.removeItem(AS_REFRESH_TOKEN_EXPIRY_KEY)
    ])
  }
}
