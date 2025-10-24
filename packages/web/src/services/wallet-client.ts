import { WalletClient } from '@audius/common/services'

import { audiusBackendInstance } from './audius-backend/audius-backend-instance'
import { audiusSdk } from './audius-sdk'
import { env } from './env'

export const walletClient = new WalletClient({
  audiusBackendInstance,
  audiusSdk,
  env
})
