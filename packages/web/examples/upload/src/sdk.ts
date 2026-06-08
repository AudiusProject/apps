import type { AudiusSdk } from '@audius/sdk'
import { sdk } from '@audius/sdk'

import { config } from './config'

const APP_NAME = 'OAuthUploadExample'

let sdkInstance: AudiusSdk | null = null

/**
 * Returns a singleton SDK instance initialised with the developer app API key.
 * The API key enables PKCE-based OAuth for the write scope so that
 * sdk.oauth.login({ scope: 'write' }) stores an access token internally,
 * allowing sdk.tracks.createTrack to be called directly from the browser
 * without a backend server.
 */
export function getSDK(): AudiusSdk {
  if (!sdkInstance) {
    // Use the current page as the redirect URI — the popup redirects here and
    // handleRedirect() detects window.opener, forwards the code to the parent,
    // and closes the popup.
    const redirectUri =
      window.location.origin + window.location.pathname
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
