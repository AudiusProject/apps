import {
  createAuthService,
  createHedgehogSolanaWalletService
} from '@audius/common/services'
import {
  createHedgehogWalletClient,
  type AudiusWalletClient
} from '@audius/sdk/full'
import { getWalletClient } from '@wagmi/core'
import { type WalletClient } from 'viem'

import { audiusChain, wagmiAdapter } from 'app/ReownAppKitModal'

import { env } from '../env'
import { localStorage } from '../local-storage'

const wagmiConfig = wagmiAdapter.wagmiConfig

export const getAudiusWalletClient = async (): Promise<AudiusWalletClient> => {
  // Check if the user has already connected Hedgehog first...
  await authService.hedgehogInstance.waitUntilReady()
  const hedgehogWallet = authService.getWallet()
  if (hedgehogWallet) {
    console.debug(
      '[audiusSdk] Found Hedgehog wallet:',
      hedgehogWallet.getAddressString(),
      'Initializing SDK with Hedgehog...'
    )
    return createHedgehogWalletClient(authService.hedgehogInstance)
  }

  // Try the connected external wallet next...
  console.debug('[audiusSdk] Initializing SDK with external wallet...')

  // Wait for the wallet to finish connecting/reconnecting
  if (
    wagmiConfig.state.status === 'reconnecting' ||
    wagmiConfig.state.status === 'connecting'
  ) {
    console.debug(
      `[audiusSdk] Waiting for external wallet to finish ${wagmiConfig.state.status}...`
    )
    let unsubscribe: undefined | (() => void)
    await new Promise<void>((resolve) => {
      unsubscribe = wagmiConfig.subscribe(
        (state) => state.status,
        () => {
          resolve()
        }
      )
    })
    unsubscribe?.()
  }
  console.debug(`[audiusSdk] External wallet ${wagmiConfig.state.status}`)

  // If connected, initialize the viem WalletClient. Else fall back to Hedgehog.
  if (
    wagmiConfig.state.status === 'connected' &&
    wagmiConfig.state.chainId === audiusChain.id
  ) {
    const client = await getWalletClient(wagmiConfig, {
      chainId: audiusChain.id
    })
    return client satisfies WalletClient as unknown as AudiusWalletClient
  } else {
    console.warn(
      '[audiusSdk] External wallet not connected to Audius chain. Falling back to Hedgehog.',
      {
        status: wagmiConfig.state.status,
        chainId: wagmiConfig.state.chainId
      }
    )
    return createHedgehogWalletClient(authService.hedgehogInstance)
  }
}

export const authService = createAuthService({
  localStorage,
  identityServiceEndpoint: env.IDENTITY_SERVICE
})

export const solanaWalletService = createHedgehogSolanaWalletService(
  authService.hedgehogInstance
)
