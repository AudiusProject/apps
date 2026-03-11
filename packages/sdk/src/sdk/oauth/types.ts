export const OAUTH_SCOPE_OPTIONS = ['read', 'write', 'write_once'] as const
type OAuthScopesTuple = typeof OAUTH_SCOPE_OPTIONS
export type OAuthScopeOption = OAuthScopesTuple[number]
export type OAuthScope = OAuthScopeOption | OAuthScopeOption[]
export type LoginResult = {
  profile: import('../api/generated/default').DecodedUserToken
  encodedJwt: string
}
export type WriteOnceParams =
  | {
      tx: 'connect_dashboard_wallet'
      wallet: string
    }
  | {
      tx: 'disconnect_dashboard_wallet'
      wallet: string
    }
