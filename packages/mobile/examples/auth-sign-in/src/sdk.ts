import type { AudiusSdk } from '@audius/sdk'
import { sdk } from '@audius/sdk'

const APP_NAME = 'AudiusAuthExample'

let unauthenticatedSdk: AudiusSdk | null = null
let authenticatedSdk: AudiusSdk | null = null

/** Unauthenticated SDK (OAuth URL, verify token, public feed). */
export function getSDK(): AudiusSdk {
  if (!unauthenticatedSdk) {
    unauthenticatedSdk = sdk({ appName: APP_NAME })
  }
  return unauthenticatedSdk
}

/** Authenticated SDK with bearer token (after OAuth). */
export function getAuthenticatedSDK(bearerToken: string): AudiusSdk {
  if (authenticatedSdk) {
    return authenticatedSdk
  }
  authenticatedSdk = sdk({
    appName: APP_NAME,
    apiKey: '0x0000000000000000000000000000000000000000',
    bearerToken
  })
  return authenticatedSdk
}

export function clearAuthenticatedSDK(): void {
  authenticatedSdk = null
}

/** Returns the current authenticated SDK if the user has signed in; null otherwise. */
export function getCurrentAuthenticatedSDK(): AudiusSdk | null {
  return authenticatedSdk
}
