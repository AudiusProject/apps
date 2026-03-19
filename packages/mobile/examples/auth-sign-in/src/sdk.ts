import type { AudiusSdk } from '@audius/sdk'
import { sdk } from '@audius/sdk'

const APP_NAME = 'AudiusAuthExample'
const REDIRECT_URI = 'audiusauth://oauth/callback'

const apiKey =
  typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_AUDIUS_API_KEY != null
    ? String(process.env.EXPO_PUBLIC_AUDIUS_API_KEY).trim()
    : undefined

let sdkInstance: AudiusSdk | null = null

/**
 * Single SDK instance. When the user logs in via oauth.login(), the SDK stores
 * access/refresh tokens (AsyncStorage on mobile) and automatically adds
 * authorization headers to subsequent requests.
 */
export function getSDK(): AudiusSdk {
  if (!sdkInstance) {
    sdkInstance = sdk({
      appName: APP_NAME,
      apiKey: apiKey ?? '0x0000000000000000000000000000000000000000',
      redirectUri: REDIRECT_URI
    })
  }
  return sdkInstance
}

export const config = {
  apiKey,
  redirectUri: REDIRECT_URI,
  isConfigured: Boolean(apiKey)
}
