import { z } from 'zod'

import { isApiKeyValid } from '../utils/apiKey'

export const IsWriteAccessGrantedSchema = z.object({
  userId: z.string(),
  apiKey: z.optional(
    z.custom<string>((data: unknown) => {
      return isApiKeyValid(data as string)
    })
  )
})

export type IsWriteAccessGrantedRequest = z.input<
  typeof IsWriteAccessGrantedSchema
>

export const OAUTH_SCOPE_OPTIONS = ['read', 'write', 'write_once'] as const
type OAuthScopesTuple = typeof OAUTH_SCOPE_OPTIONS
export type OAuthScopeOption = OAuthScopesTuple[number]
export type OAuthScope = OAuthScopeOption | OAuthScopeOption[]
export type WriteOnceParams =
  | {
      tx: 'connect_dashboard_wallet'
      wallet: string
    }
  | {
      tx: 'disconnect_dashboard_wallet'
      wallet: string
    }

export type OAuthEnv = 'production'

export const OAUTH_URL = {
  production: 'https://audius.co/oauth/auth'
} as Record<OAuthEnv, string>
