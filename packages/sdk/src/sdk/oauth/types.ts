export const OAUTH_SCOPE_OPTIONS = ['read', 'write'] as const
type OAuthScopesTuple = typeof OAUTH_SCOPE_OPTIONS
export type OAuthScopeOption = OAuthScopesTuple[number]
export type OAuthScope = OAuthScopeOption | OAuthScopeOption[]
