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

  async getAccessToken(): Promise<string | null> {
    return this._accessToken
  }

  async getRefreshToken(): Promise<string | null> {
    return this._refreshToken
  }

  async setTokens(access: string, refresh: string): Promise<void> {
    this._accessToken = access
    this._refreshToken = refresh
  }

  async clear(): Promise<void> {
    this._accessToken = null
    this._refreshToken = null
  }

}
