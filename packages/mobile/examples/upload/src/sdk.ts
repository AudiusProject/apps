import type { AudiusSdk } from '@audius/sdk'
import { sdk } from '@audius/sdk'

import { config } from './config'

const APP_NAME = 'UploadExample'

let sdkInstance: AudiusSdk | null = null

/** SDK for verify token, uploads (audio/image to storage), and public reads. */
export function getSDK(): AudiusSdk {
  if (!sdkInstance) {
    sdkInstance = sdk(
      config.apiKey
        ? {
            appName: APP_NAME,
            apiKey: config.apiKey
          }
        : { appName: APP_NAME }
    )
  }
  return sdkInstance
}
