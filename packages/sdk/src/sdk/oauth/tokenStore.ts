/**
 * Contract for storing and providing OAuth access/refresh tokens.
 * Implement this interface to customize how tokens are persisted
 * (e.g. in-memory only, encrypted storage, cookie-based, etc.)
 */
export interface OAuthTokenStore {
  getAccessToken(): Promise<string | null>
  getRefreshToken(): Promise<string | null>
  setTokens(access: string, refresh: string): Promise<void>
  clear(): Promise<void>
}
