import {
  createAuthService,
  createHedgehogSolanaWalletService
} from '@audius/common/services'
import {
  createHedgehogWalletClient,
  type AudiusWalletClient
} from '@audius/sdk'
import { type WalletClient } from 'viem'

import { hasPersistedWalletConnection, loadAppKit } from 'app/appkit'
import { audiusChain } from 'app/audiusChain'

import { env } from '../env'
import { localStorage } from '../local-storage'

import { createKey } from './createKey'

export const getAudiusWalletClient = async (): Promise<AudiusWalletClient> => {
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

  if (!hasPersistedWalletConnection()) {
    return createHedgehogWalletClient(authService.hedgehogInstance)
  }

  console.debug('[audiusSdk] Initializing SDK with external wallet...')

  const appkit = await loadAppKit().catch((e) => {
    console.warn(
      '[audiusSdk] Failed to load AppKit. Falling back to Hedgehog.',
      e
    )
    return undefined
  })
  if (!appkit) {
    return createHedgehogWalletClient(authService.hedgehogInstance)
  }
  const wagmiConfig = appkit.wagmiAdapter.wagmiConfig
  const { getWalletClient, reconnect } = await import('@wagmi/core')

  if (
    wagmiConfig.state.status === 'disconnected' &&
    wagmiConfig.state.current
  ) {
    await reconnect(wagmiConfig)
  }

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
  identityServiceEndpoint: env.IDENTITY_SERVICE,
  createKey
})

export const solanaWalletService = createHedgehogSolanaWalletService(
  authService.hedgehogInstance
)
