import {
  createSdkWithServices,
  type AudiusSdkWithServices
} from '@audius/sdk'

let serverSdk: AudiusSdkWithServices | null = null

/**
 * Server-side SDK initialized with the developer app's API key + bearer
 * token. The bearer token grants the app permission to act on behalf of
 * any user who has authorized it via OAuth.
 *
 * Per the SDK README: "Bearer Token — backend only. Grants your app the
 * ability to act on behalf of users who have authorized it. Never expose
 * this in browser or mobile code."
 *
 * We use createSdkWithServices (rather than the public sdk() factory) so
 * sdk.tracks is the wrapped TracksApi with friendly helpers like
 * getTrackStreamUrl, getTrackDownloadUrl, and the createTrack overload
 * that handles audio + image upload + trackCid in one call.
 */
export function getServerSDK(): AudiusSdkWithServices {
  if (serverSdk) return serverSdk
  const apiKey = process.env.AUDIUS_API_KEY
  const bearerToken = process.env.AUDIUS_BEARER_TOKEN
  if (!apiKey || !bearerToken) {
    throw new Error(
      'AUDIUS_API_KEY and AUDIUS_BEARER_TOKEN must be set on the server.'
    )
  }
  serverSdk = createSdkWithServices({
    apiKey,
    bearerToken,
    appName: 'AudiusTrackMigration'
  })
  return serverSdk
}
