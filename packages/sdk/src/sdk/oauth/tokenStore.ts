const LS_ACCESS_TOKEN_KEY = 'audius_access_token'
const LS_REFRESH_TOKEN_KEY = 'audius_refresh_token'

/**
 * Token store for OAuth2 PKCE tokens.
 *
 * Holds the current access + refresh token pair in memory and persists them
 * to `localStorage` so they survive page reloads.  The `asAccessTokenProvider`
 * method returns a function compatible with `Configuration.accessToken` so
 * that all generated API instances automatically pick up new tokens after
 * login or refresh — no re-construction needed.
 */
export class OAuthTokenStore {
  private _accessToken: string | null = null
  private _refreshToken: string | null = null

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const storage = window.localStorage
        this._accessToken = storage.getItem(LS_ACCESS_TOKEN_KEY) ?? null
        this._refreshToken = storage.getItem(LS_REFRESH_TOKEN_KEY) ?? null
      } catch {
        // If localStorage is unavailable or throws, treat as no persisted tokens.
        this._accessToken = null
        this._refreshToken = null
      }
    }
  }

  get accessToken(): string | null {
    return this._accessToken
  }

  get refreshToken(): string | null {
    return this._refreshToken
  }

  /**
   * Store a new access / refresh pair (e.g. after code exchange or refresh).
   */
  setTokens(access: string, refresh: string): void {
    this._accessToken = access
    this._refreshToken = refresh
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(LS_ACCESS_TOKEN_KEY, access)
      window.localStorage.setItem(LS_REFRESH_TOKEN_KEY, refresh)
    }
  }

  /**
   * Clear all stored tokens (e.g. on logout / revocation).
   */
  clear(): void {
    this._accessToken = null
    this._refreshToken = null
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(LS_ACCESS_TOKEN_KEY)
      window.localStorage.removeItem(LS_REFRESH_TOKEN_KEY)
    }
  }

  /**
   * Returns a function suitable for `Configuration.accessToken`.
   *
   * The generated API client calls this before every request.  When no token
   * has been set yet, it returns `""` which the client treats as
   * unauthenticated (no Authorization header).
   */
  asAccessTokenProvider(): () => Promise<string> {
    return async () => this._accessToken ?? ''
  }
}
