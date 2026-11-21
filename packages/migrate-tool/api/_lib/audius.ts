import { createSdkWithServices, type AudiusSdkWithServices } from '@audius/sdk'

let serverSdk: AudiusSdkWithServices | null = null

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
