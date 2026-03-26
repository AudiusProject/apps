import type { AudiusSdk } from '@audius/sdk'
import { sdk } from '@audius/sdk'

import { config } from './config'

const APP_NAME = 'CoinGatedExample'

let sdkInstance: AudiusSdk | null = null

/**
 * Returns a singleton SDK instance. The API key enables OAuth for
 * authenticated access checks on coin-gated tracks.
 */
export function getSDK(): AudiusSdk {
  if (!sdkInstance) {
    const redirectUri = window.location.origin + window.location.pathname
    sdkInstance = config.apiKey
      ? sdk({
          appName: APP_NAME,
          apiKey: config.apiKey,
          redirectUri,
          environment: config.environment
        })
      : sdk({ appName: APP_NAME, redirectUri, environment: config.environment })
  }
  return sdkInstance
}
