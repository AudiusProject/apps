import type { AudiusSdk } from '@audius/sdk'
import { sdk } from '@audius/sdk'
import { config } from './config'

const APP_NAME = 'UpdateProfileExample'

let unauthenticatedSdk: AudiusSdk | null = null
let authenticatedSdk: AudiusSdk | null = null

export function getSDK(): AudiusSdk {
  if (!unauthenticatedSdk) {
    unauthenticatedSdk = sdk(
      config.apiKey ? { appName: APP_NAME, apiKey: config.apiKey } : { appName: APP_NAME }
    )
  }
  return unauthenticatedSdk
}

export function getAuthenticatedSDK(bearerToken: string): AudiusSdk {
  if (authenticatedSdk) return authenticatedSdk
  authenticatedSdk = sdk({
    appName: APP_NAME,
    apiKey: config.apiKey ?? '0x0000000000000000000000000000000000000000',
    bearerToken
  })
  return authenticatedSdk
}

export function clearAuthenticatedSDK(): void {
  authenticatedSdk = null
}
