import type { OAuthTokenStore } from './tokenStore'

const LS_ACCESS_TOKEN_KEY = 'audius_access_token'
const LS_REFRESH_TOKEN_KEY = 'audius_refresh_token'

/**
 * Default token store implementation that persists tokens to `localStorage`
 * so they survive page reloads.
 */
export class TokenStoreLocalStorage implements OAuthTokenStore {
  async getAccessToken(): Promise<string | null> {
    try {
      return window.localStorage.getItem(LS_ACCESS_TOKEN_KEY)
    } catch {
      return null
    }
  }

  async getRefreshToken(): Promise<string | null> {
    try {
      return window.localStorage.getItem(LS_REFRESH_TOKEN_KEY)
    } catch {
      return null
    }
  }

  async setTokens(access: string, refresh: string): Promise<void> {
    window.localStorage.setItem(LS_ACCESS_TOKEN_KEY, access)
    window.localStorage.setItem(LS_REFRESH_TOKEN_KEY, refresh)
  }

  async clear(): Promise<void> {
    window.localStorage.removeItem(LS_ACCESS_TOKEN_KEY)
    window.localStorage.removeItem(LS_REFRESH_TOKEN_KEY)
  }
}
