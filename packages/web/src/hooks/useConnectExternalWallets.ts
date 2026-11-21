import { useState, useCallback, useEffect, useRef } from 'react'

import { useCurrentAccountUser } from '@audius/common/api'
import { isLightTheme } from '@audius/harmony'
import { useTheme } from '@emotion/react'
import type { NamespaceTypeMap } from '@reown/appkit'
import { mainnet } from '@reown/appkit/networks'
import {
  EventsControllerState,
  useAppKit,
  useDisconnect
} from '@reown/appkit/react'
import { useSwitchAccount, useAccount } from 'wagmi'

import { appkitModal, audiusChain, wagmiAdapter } from 'app/ReownAppKitModal'
export class AlreadyAssociatedError extends Error {
  name = 'AlreadyAssociatedError'
}

export const useConnectExternalWallets = (
  onSuccess?: (wallets: {
    solana: string | undefined
    eth: string | undefined
  }) => void,
  onError?: (error: EventsControllerState) => void
) => {
  const theme = useTheme()
  const { open: openAppKitModal, close: closeAppKitModal } = useAppKit()
  const { data: currentUser } = useCurrentAccountUser()
  const [currentWallets, setCurrentWallets] = useState<{
    solana: string | undefined
    eth: string | undefined
  } | null>(null)
  const { switchAccountAsync } = useSwitchAccount({
    config: wagmiAdapter.wagmiConfig
  })
  const { disconnect } = useDisconnect()

  const [isConnecting, setIsConnecting] = useState(false)

  const { isConnected, connector, chainId } = useAccount({
    config: wagmiAdapter.wagmiConfig
  })
  const originalConnectorRef = useRef(connector)
  const originalChainIdRef = useRef(chainId)
  const usingExternalWalletAuthRef = useRef(
    !!originalConnectorRef.current &&
      originalChainIdRef.current === audiusChain.id
  )

  const openAppKitModalCallback = useCallback(
    async (namespace?: keyof NamespaceTypeMap) => {
      setIsConnecting(true)
      if (isConnected) {
        await disconnect()
      }
      appkitModal.updateFeatures({ socials: false, email: false })
      appkitModal.setThemeMode(isLightTheme(theme.type) ? 'light' : 'dark')
      await appkitModal.switchNetwork(mainnet)
      await openAppKitModal({ view: 'Connect', namespace })
    },
    [disconnect, isConnected, openAppKitModal, theme]
  )

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
  useEffect(() => {
    return appkitModal.subscribeEvents(async (event) => {
      if (!isConnecting) return

      if (event.data.event === 'CONNECT_SUCCESS') {
        setIsConnecting(false)
        const solanaAccount = appkitModal.getAccount('solana')
        const ethAccount = appkitModal.getAccount('eip155')
        const solAddress = solanaAccount?.address
        const ethAddress = ethAccount?.address

        if (!solAddress && !ethAddress) {
          console.error(
            'Connect Wallet Error',
            new Error('No wallets found to connect')
          )
        }

        setCurrentWallets({
          solana: solAddress,
          eth: ethAddress
        })
        await onSuccess?.({
          solana: solAddress,
          eth: ethAddress
        })
        await reconnectExternalAuthWallet()
        closeAppKitModal()
      } else if (event.data.event === 'CONNECT_ERROR') {
        setIsConnecting(false)
        console.error('Connect Wallet Error', new Error('Connect Wallet Error'))
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
    currentWallets,
    disconnect,
    openAppKitModal: openAppKitModalCallback
  }
}
