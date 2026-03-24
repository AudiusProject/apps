import type { AudiusSdk } from '@audius/sdk'
import { sdk } from '@audius/sdk'

import { config, REDIRECT_URI } from './config'

const APP_NAME = 'AudiusAuthExample'

let sdkInstance: AudiusSdk | null = null

/**
 * Single SDK instance. When the user logs in via oauth.login(), the SDK stores
 * access/refresh tokens (AsyncStorage on mobile) and automatically adds
 * authorization headers to subsequent requests.
 */
export function getSDK(): AudiusSdk {
  if (!sdkInstance) {
    sdkInstance = sdk(
      config.apiKey
        ? {
            appName: APP_NAME,
            apiKey: config.apiKey,
            redirectUri: REDIRECT_URI
          }
        : { appName: APP_NAME, redirectUri: REDIRECT_URI }
    )
  }
  return sdkInstance
}

export { config }
