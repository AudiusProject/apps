import type { AudiusSdk } from '@audius/sdk'
import { sdk } from '@audius/sdk'

import { config } from './config'

const APP_NAME = 'UpdateProfileExample'
const REDIRECT_URI = 'updateprofile://oauth/callback'

let sdkInstance: AudiusSdk | null = null

/**
 * Single SDK instance. After oauth.login({ scope: 'write' }), the SDK stores
 * tokens and automatically adds authorization headers (including updateUser).
 */
export function getSDK(): AudiusSdk {
  if (!sdkInstance) {
    sdkInstance = sdk({
      appName: APP_NAME,
      apiKey: config.apiKey ?? '',
      redirectUri: REDIRECT_URI
    })
  }
  return sdkInstance
}

export { config }
