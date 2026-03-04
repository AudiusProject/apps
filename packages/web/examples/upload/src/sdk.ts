import type { AudiusSdk } from '@audius/sdk'
import { sdk } from '@audius/sdk'
import { config } from './config'

const APP_NAME = 'UploadExample'

let sdkInstance: AudiusSdk | null = null

/**
 * Get or create the singleton SDK instance.
 * Uses apiKey when configured (for OAuth → developer app association).
 * Same pattern as the mobile upload example (packages/mobile/examples/upload).
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
