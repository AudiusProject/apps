import type { AudiusSdk } from '@audius/sdk'
import { sdk } from '@audius/sdk'
import { config } from './config'

const APP_NAME = 'UpdateProfileExample'

let sdkInstance: AudiusSdk | null = null

/**
 * Get or create the singleton SDK instance.
 * Uses apiKey when configured (for OAuth → developer app association).
 * Same pattern as the mobile update-profile example (packages/mobile/examples/update-profile).
 */
export function getSDK(): AudiusSdk {
  if (!sdkInstance) {
    if (config.apiKey) {
      sdkInstance = sdk({ appName: APP_NAME, apiKey: config.apiKey })
    } else {
      sdkInstance = sdk({ appName: APP_NAME })
    }
  }
  return sdkInstance
}
