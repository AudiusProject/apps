import { useState, useCallback } from 'react'

import {
  type ConnectedWallet,
  useAssociatedWallets,
  useAddAssociatedWallet,
  useCurrentAccountUser
} from '@audius/common/api'
import { Chain } from '@audius/common/models'
import type { NamespaceTypeMap } from '@reown/appkit'
import type { EventsControllerState } from '@reown/appkit/react'
import type { Provider as SolanaProvider } from '@reown/appkit-adapter-solana/react'
import type { Hex } from 'viem'
import { useSignMessage } from 'wagmi'

import { appkitModal, wagmiAdapter } from 'app/ReownAppKitModal'

import { useConnectExternalWallets } from './useConnectExternalWallets'

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

export class AlreadyAssociatedError extends Error {
  name = 'AlreadyAssociatedError'
}

export const useConnectAndAssociateWallets = (
  onSuccess?: (wallets: ConnectedWallet[]) => void,
  onError?: (error: unknown) => void
) => {
  const { signMessageAgnostic } = useSignMessageAgnostic()
  const { data: currentUser } = useCurrentAccountUser()
  const { data: connectedWallets } = useAssociatedWallets()
  const [isAssociating, setIsAssociating] = useState(false)

  const { mutateAsync: addConnectedWalletAsync } = useAddAssociatedWallet()

  const associateConnectedWallets = useCallback(async () => {
    try {
      setIsAssociating(true)
      const activeAccount = appkitModal.getAccount()
      const originalAddress = currentUser?.wallet

      const wallets =
        activeAccount?.allAccounts.map((a) => ({
          ...a,
          chain: a.namespace === 'eip155' ? Chain.Eth : Chain.Sol
        })) ?? []

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

      if (filteredWallets.length === 0) {
        if (wallets.length > 0) {
          throw new AlreadyAssociatedError('Wallets already added')
        } else {
          throw new Error('No wallets selected')
        }
      }

      const signatures = []
      for (const { address, chain, namespace } of filteredWallets) {
        console.debug('[associate-wallet]', 'Getting wallet signature', {
          address,
          chain
        })
        const signature = await signMessageAgnostic(
          `AudiusUserID:${currentUser?.user_id}`,
          address,
          namespace
        )
        signatures.push({ address, chain, signature })
      }

      for (const { address, chain, signature } of signatures) {
        console.debug('[associate-wallet]', 'Associating wallet...', {
          address,
          chain
        })
        await addConnectedWalletAsync({
          wallet: { address, chain },
          signature
        })
      }

      onSuccess?.(filteredWallets)
    } catch (e) {
      onError?.(e)
    } finally {
      setIsAssociating(false)
    }
  }, [
    addConnectedWalletAsync,
    connectedWallets,
    currentUser?.user_id,
    currentUser?.wallet,
    onError,
    onSuccess,
    signMessageAgnostic
  ])

  const handleConnectSuccess = useCallback(async () => {
    await associateConnectedWallets()
  }, [associateConnectedWallets])

  const handleConnectError = useCallback(
    (event: EventsControllerState) => {
      onError?.(event)
    },
    [onError]
  )

  const { isPending: isConnecting, openAppKitModal } =
    useConnectExternalWallets(handleConnectSuccess, handleConnectError)

  return {
    isPending: isConnecting || isAssociating,
    openAppKitModal
  }
}
