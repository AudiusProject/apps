/**
 * In-memory token store for OAuth2 PKCE tokens.
 *
 * Holds the current access + refresh token pair.  The `asAccessTokenProvider`
 * method returns a function compatible with `Configuration.accessToken` so
 * that all generated API instances automatically pick up new tokens after
 * login or refresh — no re-construction needed.
 */
export class OAuthTokenStore {
  private _accessToken: string | null = null
  private _refreshToken: string | null = null

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
  }

  /**
   * Clear all stored tokens (e.g. on logout / revocation).
   */
  clear(): void {
    this._accessToken = null
    this._refreshToken = null
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
