import AsyncStorage from '@react-native-async-storage/async-storage'

import type { OAuthTokenStore } from './tokenStore'

const AS_ACCESS_TOKEN_KEY = 'audius_access_token'
const AS_REFRESH_TOKEN_KEY = 'audius_refresh_token'

export class TokenStoreAsyncStorage implements OAuthTokenStore {
  getAccessToken(): Promise<string | null> {
    return AsyncStorage.getItem(AS_ACCESS_TOKEN_KEY)
  }

  getRefreshToken(): Promise<string | null> {
    return AsyncStorage.getItem(AS_REFRESH_TOKEN_KEY)
  }

  async setTokens(access: string, refresh: string): Promise<void> {
    await Promise.all([
      AsyncStorage.setItem(AS_ACCESS_TOKEN_KEY, access),
      AsyncStorage.setItem(AS_REFRESH_TOKEN_KEY, refresh)
    ])
  }

  async clear(): Promise<void> {
    await Promise.all([
      AsyncStorage.removeItem(AS_ACCESS_TOKEN_KEY),
      AsyncStorage.removeItem(AS_REFRESH_TOKEN_KEY)
    ])
  }
}
