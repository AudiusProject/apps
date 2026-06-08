import { OAUTH_SCOPE_OPTIONS } from '../oauth'

export const isOAuthScopeValid = (scope: string[]) => {
  const validScopes = new Set(OAUTH_SCOPE_OPTIONS)
  return scope.findIndex((s) => !validScopes.has(s as any)) === -1
}
