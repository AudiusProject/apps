import {
  createAuthService,
  createHedgehogSolanaWalletService
} from '@audius/common/services'
import { createHedgehogWalletClient } from '@audius/sdk/services'

import { env } from 'app/services/env'

import { createPrivateKey } from '../createPrivateKey'
import { localStorage } from '../local-storage'

export const authService = createAuthService({
  localStorage,
  identityServiceEndpoint: env.IDENTITY_SERVICE,
  createKey: createPrivateKey
})

export const getAudiusWalletClient = async () =>
  createHedgehogWalletClient(authService.hedgehogInstance)

export const solanaWalletService = createHedgehogSolanaWalletService(
  authService.hedgehogInstance
)
