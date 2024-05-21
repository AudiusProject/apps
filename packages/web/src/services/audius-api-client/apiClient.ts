import { AudiusAPIClient } from '@audius/common/services'

import { audiusBackendInstance } from 'services/audius-backend/audius-backend-instance'
import { waitForLibsInit } from 'services/audius-backend/eagerLoadUtils'
import { env } from 'services/env'
import { localStorage } from 'services/local-storage'
import { remoteConfigInstance } from 'services/remote-config/remote-config-instance'

export const apiClient = new AudiusAPIClient({
  audiusBackendInstance,
  remoteConfigInstance,
  getAudiusLibs: () => window.audiusLibs,
  localStorage,
  env,
  waitForLibsInit,
  appName: env.APP_NAME,
  apiKey: env.API_KEY
})
