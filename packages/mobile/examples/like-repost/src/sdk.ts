import type { AudiusSdk } from '@audius/sdk'
import { sdk } from '@audius/sdk'

import { config } from './config'

const APP_NAME = 'LikeRepostExample'
const REDIRECT_URI = 'likerepost://oauth/callback'

let sdkInstance: AudiusSdk | null = null

/**
 * Single SDK instance. After oauth.login({ scope: 'write' }), the SDK stores
 * tokens and automatically adds authorization headers to requests (including
 * favoriteTrack, repostTrack, etc.).
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
