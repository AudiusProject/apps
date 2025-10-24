import { sdk } from '@audius/sdk'

import { env } from 'services/env'

export const audiusSdk = sdk({
  appName: env.APP_NAME
})
