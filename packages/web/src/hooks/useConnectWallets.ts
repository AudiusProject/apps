import { useState, useCallback, useEffect, useRef } from 'react'

import { useCurrentAccountUser } from '@audius/common/api'
import { useTheme } from '@emotion/react'
import type { NamespaceTypeMap } from '@reown/appkit'
import { mainnet } from '@reown/appkit/networks'
import {
  EventsControllerState,
  useAppKit,
  useDisconnect
} from '@reown/appkit/react'
import { useSwitchAccount, useAccount } from 'wagmi'

import { appkitModal, audiusChain } from 'app/ReownAppKitModal'

import { useRequiresAccountCallback } from './useRequiresAccount'

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
export const useConnectWallets = (
  onSuccess?: (wallets: EventsControllerState) => void,
  onError?: (error: EventsControllerState) => void
) => {
  const theme = useTheme()
  const { open: openAppKitModal, close: closeAppKitModal } = useAppKit()
  const { data: currentUser } = useCurrentAccountUser()
  const { switchAccountAsync } = useSwitchAccount()
  const { disconnect } = useDisconnect()

  // The state goes from modal open => connecting
  // Explicitly manage our own state for the open state of the modal
  // since there might be multiple hook instances listening for events
  const [isConnecting, setIsConnecting] = useState(false)

  // Keep track of any existing connected external wallets
  const { isConnected, connector, chainId } = useAccount()
  const originalConnectorRef = useRef(connector)
  const originalChainIdRef = useRef(chainId)
  const usingExternalWalletAuthRef = useRef(
    !!originalConnectorRef.current &&
      originalChainIdRef.current === audiusChain.id
  )

  /**
   * Opens the AppKit Modal to the wallet connect screen.
   * - Ensures the UI matches the app theme
   * - Ensures only external wallets are allowed
   * - Ensures all existing connections are disconnected
   * - Ensures that the network is set to mainnet (for Eth)
   */
  const openAppKitModalCallback = useRequiresAccountCallback(
    async (namespace?: keyof NamespaceTypeMap) => {
      // If previously connected, disconnect to give a "fresh" view of options
      if (isConnected) {
        await disconnect()
      }
      appkitModal.updateFeatures({ socials: false, email: false })
      appkitModal.setThemeMode(theme.type === 'day' ? 'light' : 'dark')
      // If the user is signed in using an external wallet, they'll be connected
      // to the audiusChain network. Reset that to mainnet to connect properly.
      await appkitModal.switchNetwork(mainnet)
      await openAppKitModal({ view: 'Connect', namespace })
      setIsConnecting(true)
    },
    [disconnect, isConnected, openAppKitModal, theme.type]
  )

  /**
   * Reconnects to the external auth wallet connector if the user wallet isn't
   * one of the connected accounts or if the chain ID doesn't match Audius
   */
  const reconnectExternalAuthWallet = useCallback(async () => {
    if (usingExternalWalletAuthRef.current && originalConnectorRef.current) {
      const connector = originalConnectorRef.current
      const accounts = await connector!.getAccounts()
      const chainId = await connector!.getChainId()
      const connectedAccountIsUserWallet =
        accounts &&
        accounts[0]?.toLowerCase() === currentUser?.wallet?.toLowerCase()
      if (!connectedAccountIsUserWallet || chainId !== audiusChain.id) {
        console.debug(
          '[associate-wallet]',
          'Reconnecting to external auth wallet...'
        )
        await connector.connect({
          chainId: audiusChain.id
        })
        await switchAccountAsync({ connector })
      }
    }
  }, [currentUser?.wallet, switchAccountAsync])
  /**
   * Handle events from the modal.
   * Typical flow is:
   * 1) SELECT_WALLET: The user has selected wallet(s) to connect
   * 2) MODAL_CLOSE: The modal was closed (it closes automatically after selection)
   * 3) CONNECT_SUCCESS || CONNECT_ERROR: The selected wallet(s) were connected,
   *    or failed to connect.
   */
  useEffect(() => {
    return appkitModal.subscribeEvents(async (event) => {
      // Ignore events not meant for this hook instance
      if (!isConnecting) return
      if (event.data.event === 'MODAL_CLOSE') {
        if (!isConnecting) {
          await reconnectExternalAuthWallet()
        }
      } else if (event.data.event === 'CONNECT_SUCCESS') {
        setIsConnecting(false)
        await onSuccess?.(event)
        closeAppKitModal()
      } else if (event.data.event === 'CONNECT_ERROR') {
        setIsConnecting(false)
        onError?.(event)
      }
    })
  }, [
    onSuccess,
    reconnectExternalAuthWallet,
    isConnecting,
    closeAppKitModal,
    onError
  ])

  return {
    isPending: isConnecting,
    openAppKitModal: openAppKitModalCallback
  }
}
