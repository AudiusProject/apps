import type { AudiusSdk } from '@audius/sdk'
import { sdk } from '@audius/sdk'
import { config } from './config'

const APP_NAME = 'GatedUploadExample'

let sdkInstance: AudiusSdk | null = null

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
