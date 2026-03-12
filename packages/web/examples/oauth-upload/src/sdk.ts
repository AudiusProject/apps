import type { AudiusSdk } from '@audius/sdk'
import { sdk } from '@audius/sdk'

import { config } from './config'

const APP_NAME = 'OAuthUploadExample'

let sdkInstance: AudiusSdk | null = null

/**
 * Returns a singleton SDK instance initialised with the developer app API key.
 * The API key enables PKCE-based OAuth for the write scope so that
 * sdk.oauth.loginAsync({ scope: 'write' }) stores an access token internally,
 * allowing sdk.tracks.createTrack to be called directly from the browser
 * without a backend server.
 */
export function getSDK(): AudiusSdk {
  if (!sdkInstance) {
    sdkInstance = config.apiKey
      ? sdk({
          appName: APP_NAME,
          apiKey: config.apiKey,
          environment: config.environment
        })
      : sdk({ appName: APP_NAME, environment: config.environment })
  }
  return sdkInstance
}
