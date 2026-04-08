import type { OAuthTokenStore } from './tokenStore'

const LS_ACCESS_TOKEN_KEY = 'audius_access_token'
const LS_REFRESH_TOKEN_KEY = 'audius_refresh_token'
const LS_ACCESS_TOKEN_EXPIRY_KEY = 'audius_access_token_expiry'
const LS_REFRESH_TOKEN_EXPIRY_KEY = 'audius_refresh_token_expiry'

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

  async getAccessTokenExpiry(): Promise<number | null> {
    try {
      const raw = window.localStorage.getItem(LS_ACCESS_TOKEN_EXPIRY_KEY)
      if (raw == null) return null
      const n = Number(raw)
      return Number.isFinite(n) ? n : null
    } catch {
      return null
    }
  }

  async getRefreshTokenExpiry(): Promise<number | null> {
    try {
      const raw = window.localStorage.getItem(LS_REFRESH_TOKEN_EXPIRY_KEY)
      if (raw == null) return null
      const n = Number(raw)
      return Number.isFinite(n) ? n : null
    } catch {
      return null
    }
  }

  async setTokens(
    access: string,
    refresh: string,
    expiresIn?: number,
    refreshExpiresIn?: number
  ): Promise<void> {
    window.localStorage.setItem(LS_ACCESS_TOKEN_KEY, access)
    window.localStorage.setItem(LS_REFRESH_TOKEN_KEY, refresh)
    if (expiresIn != null) {
      window.localStorage.setItem(
        LS_ACCESS_TOKEN_EXPIRY_KEY,
        String(Date.now() + expiresIn * 1000)
      )
    } else {
      window.localStorage.removeItem(LS_ACCESS_TOKEN_EXPIRY_KEY)
    }
    if (refreshExpiresIn != null) {
      window.localStorage.setItem(
        LS_REFRESH_TOKEN_EXPIRY_KEY,
        String(Date.now() + refreshExpiresIn * 1000)
      )
    } else {
      window.localStorage.removeItem(LS_REFRESH_TOKEN_EXPIRY_KEY)
    }
  }

  async clear(): Promise<void> {
    window.localStorage.removeItem(LS_ACCESS_TOKEN_KEY)
    window.localStorage.removeItem(LS_REFRESH_TOKEN_KEY)
    window.localStorage.removeItem(LS_ACCESS_TOKEN_EXPIRY_KEY)
    window.localStorage.removeItem(LS_REFRESH_TOKEN_EXPIRY_KEY)
  }
}
