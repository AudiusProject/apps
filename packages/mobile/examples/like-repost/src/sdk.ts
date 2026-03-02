import type { AudiusSdk } from '@audius/sdk'
import { sdk } from '@audius/sdk'
import { config } from './config'

const APP_NAME = 'LikeRepostExample'

let unauthenticatedSdk: AudiusSdk | null = null

/** Unauthenticated SDK (OAuth URL, verify token, public reads like trending). */
export function getSDK(): AudiusSdk {
  if (!unauthenticatedSdk) {
    unauthenticatedSdk = sdk(
      config.apiKey
        ? { appName: APP_NAME, apiKey: config.apiKey }
        : { appName: APP_NAME }
    )
  }
  return unauthenticatedSdk
}
