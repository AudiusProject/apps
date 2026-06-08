import type { AudiusSdk } from '@audius/sdk'
import { sdk } from '@audius/sdk'

import { config } from './config'

const APP_NAME = 'UploadExample'
const REDIRECT_URI = 'audiusupload://oauth/callback'

let sdkInstance: AudiusSdk | null = null

/** SDK for verify token, uploads (audio/image to storage), and public reads. */
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
