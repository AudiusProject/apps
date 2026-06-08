import type { OAuthTokenStore } from './tokenStore'

/**
 * In-memory token store with no external dependencies.
 *
 * Tokens are lost when the process exits. Only suitable for applications that
 * do not need tokens to survive session restarts. For persistence, use one of:
 *
 * - `TokenStoreLocalStorage` — browser apps; survives page reloads
 * - `TokenStoreAsyncStorage` — React Native apps; survives app restarts
 */
export class TokenStoreMemory implements OAuthTokenStore {
  private _accessToken: string | null = null
  private _refreshToken: string | null = null
  private _accessTokenExpiry: number | null = null
  private _refreshTokenExpiry: number | null = null

  async getAccessToken(): Promise<string | null> {
    return this._accessToken
  }

  async getRefreshToken(): Promise<string | null> {
    return this._refreshToken
  }

  async getAccessTokenExpiry(): Promise<number | null> {
    return this._accessTokenExpiry
  }

  async getRefreshTokenExpiry(): Promise<number | null> {
    return this._refreshTokenExpiry
  }

  async setTokens(
    access: string,
    refresh: string,
    expiresIn?: number,
    refreshExpiresIn?: number
  ): Promise<void> {
    this._accessToken = access
    this._refreshToken = refresh
    this._accessTokenExpiry =
      expiresIn != null ? Date.now() + expiresIn * 1000 : null
    this._refreshTokenExpiry =
      refreshExpiresIn != null ? Date.now() + refreshExpiresIn * 1000 : null
  }

  async clear(): Promise<void> {
    this._accessToken = null
    this._refreshToken = null
    this._accessTokenExpiry = null
    this._refreshTokenExpiry = null
  }
}
