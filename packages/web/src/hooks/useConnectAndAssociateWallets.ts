import { useState, useCallback } from 'react'

import {
  type ConnectedWallet,
  useAssociatedWallets,
  useAddAssociatedWallet,
  useCurrentAccountUser
} from '@audius/common/api'
import { useAppContext } from '@audius/common/context'
import { Name, Chain } from '@audius/common/models'
import type { NamespaceTypeMap } from '@reown/appkit'
import type { EventsControllerState } from '@reown/appkit/react'
import type { Provider as SolanaProvider } from '@reown/appkit-adapter-solana/react'
import type { Hex } from 'viem'
import { useSignMessage } from 'wagmi'

import { appkitModal, wagmiAdapter } from 'app/ReownAppKitModal'

import { useExternalWallets } from './useExternalWallets'

/**
 * Helper hook that signs a message using the current connected wallet, whether
 * using Solana or Ethereum.
 */
export const useSignMessageAgnostic = () => {
  const { signMessageAsync } = useSignMessage({
    config: wagmiAdapter.wagmiConfig
  })

  const signMessageAgnostic = useCallback(
    async (
      message: string,
      account: string,
      namespace: keyof NamespaceTypeMap
    ) => {
      if (namespace === 'solana') {
        const solanaProvider = appkitModal.getProvider<SolanaProvider>('solana')
        if (!solanaProvider) {
          throw new Error('Missing SolanaProvider')
        }
        console.debug('[associate-wallet]', 'Signing with SolanaProvider...')
        const encodedMessage = new TextEncoder().encode(message)
        const signatureBytes = await solanaProvider.signMessage(encodedMessage)
        return Buffer.from(signatureBytes).toString('hex')
      } else {
        console.debug('[associate-wallet]', 'Signing with Wagmi...')
        return await signMessageAsync({
          account: account as Hex | undefined,
          message
        })
      }
    },
    [signMessageAsync]
  )
  return { signMessageAgnostic }
}

/**
 * Error when trying to associate a wallet that was already associated
 */
export class AlreadyAssociatedError extends Error {
  name = 'AlreadyAssociatedError'
}

/**
 * A wrapper around addConnectedWallet that handles actually connecting
 * the wallets using AppKit's modal. Once AppKit fires the success event,
 * it then gets signatures from all the connected wallets for the
 * addConnectedWallet mutation, which it then calls for each connected wallet.
 *
 * - Existing connected wallets (including the auth wallet) are not re-added
 * - The AppKit modal matches the theme and is configured properly
 * - Works when a use is signed in using an external wallet
 * - Handles when the user selects more than one wallet to connect at a time
 *
 * @param onSuccess handler for when wallets are successfully associated
 * @param onError handler for when something goes wrong
 *
 * @returns a callback for opening the AppKit modal, and an `isPending` flag
 * which is true when a wallet is in the process of being associated.
 */
export const useConnectAndAssociateWallets = (
  onSuccess?: (wallets: ConnectedWallet[]) => void,
  onError?: (error: unknown) => void
) => {
  const {
    analytics: { track, make }
  } = useAppContext()
  const { signMessageAgnostic } = useSignMessageAgnostic()
  const { data: currentUser } = useCurrentAccountUser()
  const { data: connectedWallets } = useAssociatedWallets()
  const [isAssociating, setIsAssociating] = useState(false)

  const { mutateAsync: addConnectedWalletAsync } = useAddAssociatedWallet()

  /**
   * Associates any Reown connected wallets to the user's account.
   */
  const associateConnectedWallets = useCallback(async () => {
    try {
      setIsAssociating(true)
      track(make({ eventName: Name.CONNECT_WALLET_NEW_WALLET_START }))
      const activeAccount = appkitModal.getAccount()
      const originalAddress = currentUser?.wallet

      // Map the wallets to add our chain format
      const wallets =
        activeAccount?.allAccounts.map((a) => ({
          ...a,
          chain: a.namespace === 'eip155' ? Chain.Eth : Chain.Sol
        })) ?? []

      // Filter out the user's auth wallet and any already connected wallets
      const filteredWallets = wallets?.filter(
        (w) =>
          w.address.toLowerCase() !== originalAddress?.toLocaleLowerCase() &&
          !connectedWallets?.find((w2) => w2.address === w.address)
      )
      console.debug(
        '[associate-wallet]',
        'Wallets to associate:',
        filteredWallets
      )

      // Ensure there are wallets to associate
      if (filteredWallets.length === 0) {
        if (wallets.length > 0) {
          for (const { chain, address } of wallets) {
            track(
              make({
                eventName: Name.CONNECT_WALLET_ALREADY_ASSOCIATED,
                chain,
                walletAddress: address
              })
            )
          }
          throw new AlreadyAssociatedError('Wallets already added')
        } else {
          throw new Error('No wallets selected')
        }
      }

      // Gather all signatures while connected
      const signatures = []
      for (const { address, chain, namespace } of filteredWallets) {
        console.debug('[associate-wallet]', 'Getting wallet signature', {
          address,
          chain
        })
        track(
          make({
            eventName: Name.CONNECT_WALLET_NEW_WALLET_CONNECTING,
            chain,
            walletAddress: address
          })
        )
        const signature = await signMessageAgnostic(
          `AudiusUserID:${currentUser?.user_id}`,
          address,
          namespace
        )
        signatures.push({ address, chain, signature })
      }

      // Send transactions via SDK to the network to add the association
      for (const { address, chain, signature } of signatures) {
        console.debug('[associate-wallet]', 'Associating wallet...', {
          address,
          chain
        })
        await addConnectedWalletAsync({
          wallet: { address, chain },
          signature
        })
        track(
          make({
            eventName: Name.CONNECT_WALLET_NEW_WALLET_CONNECTED,
            chain,
            walletAddress: address
          })
        )
      }

      // DONE!
      onSuccess?.(filteredWallets)
    } catch (e) {
      track(make({ eventName: Name.CONNECT_WALLET_ERROR, error: String(e) }))
      onError?.(e)
    } finally {
      setIsAssociating(false)
    }
  }, [
    addConnectedWalletAsync,
    connectedWallets,
    currentUser?.user_id,
    currentUser?.wallet,
    make,
    onError,
    onSuccess,
    signMessageAgnostic,
    track
  ])

  /**
   * Handle wallet connection success and error events
   */
  const handleConnectSuccess = useCallback(async () => {
    await associateConnectedWallets()
  }, [associateConnectedWallets])

  const handleConnectError = useCallback(
    (event: EventsControllerState) => {
      track(
        make({
          eventName: Name.CONNECT_WALLET_ERROR,
          error: String(event.data)
        })
      )
      onError?.(event)
    },
    [make, onError, track]
  )

  const { isPending: isConnecting, openAppKitModal } = useExternalWallets(
    handleConnectSuccess,
    handleConnectError
  )

  return {
    isPending: isConnecting || isAssociating,
    openAppKitModal
  }
}
