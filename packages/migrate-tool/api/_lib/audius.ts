import {
  createSdkWithServices,
  type AudiusSdkWithServices
} from '@audius/sdk'

let serverSdk: AudiusSdkWithServices | null = null

/**
 * Server-side SDK initialized with the developer app's API key + API
 * secret. The API secret authenticates the app and lets it sign requests
 * server-side, so it must never be exposed in browser or mobile code.
 *
 * Per the SDK README: "apiSecret should only be provided server side so
 * that it isn't exposed."
 *
 * We use createSdkWithServices (rather than the public sdk() factory) so
 * sdk.tracks is the wrapped TracksApi with friendly helpers like
 * getTrackStreamUrl, getTrackDownloadUrl, and the createTrack overload
 * that handles audio + image upload + trackCid in one call.
 */
export function getServerSDK(): AudiusSdkWithServices {
  if (serverSdk) return serverSdk
  const apiKey = process.env.AUDIUS_API_KEY
  const apiSecret = process.env.AUDIUS_API_SECRET
  if (!apiKey || !apiSecret) {
    throw new Error(
      'AUDIUS_API_KEY and AUDIUS_API_SECRET must be set on the server.'
    )
  }
  serverSdk = createSdkWithServices({
    apiKey,
    apiSecret,
    appName: 'AudiusTrackMigration'
  })
  return serverSdk
}
