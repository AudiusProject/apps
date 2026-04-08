/**
 * Contract for storing and providing OAuth access/refresh tokens.
 * Implement this interface to customize how tokens are persisted
 * (e.g. in-memory only, encrypted storage, cookie-based, etc.)
 */
export interface OAuthTokenStore {
  getAccessToken(): Promise<string | null>
  getRefreshToken(): Promise<string | null>
  /** Returns the epoch (ms) at which the access token expires, or null if unknown. */
  getAccessTokenExpiry(): Promise<number | null>
  /** Returns the epoch (ms) at which the refresh token expires, or null if unknown. */
  getRefreshTokenExpiry(): Promise<number | null>
  setTokens(
    access: string,
    refresh: string,
    expiresIn?: number,
    refreshExpiresIn?: number
  ): Promise<void>
  clear(): Promise<void>
}
