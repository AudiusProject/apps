import { useCallback } from 'react'

import { isResponseError } from '@audius/common/src/utils/error'
import type { AudiusSdk } from '@audius/sdk/services'
import { mainnet } from '@reown/appkit/networks'
import { useDisconnect } from '@reown/appkit/react'
import type { ParsedCaipAddress } from '@reown/appkit-common'
import { useAppKitWallet, type Wallet } from '@reown/appkit-wallet-button/react'

import { appkitModal, audiusChain } from 'app/ReownAppKitModal'

/**
 * Checks that a user exists for the given wallet.
 */
export const doesUserExist = async (sdk: AudiusSdk, wallet: string) => {
  try {
    const { data } = await sdk.users.getUserAccount({
      wallet
    })
    if (data?.user) {
      return true
    }
  } catch (e) {
    // We expect an unauthorized response for non-users
    if (!isResponseError(e) || e.response.status !== 401) {
      throw e
    }
  }
  return false
}

/**
 * @see {@link https://github.com/MetaMask/metamask-extension/issues/31464}
 */
const isMetaMaskBug = (error: unknown) =>
  error instanceof Object &&
  'message' in error &&
  typeof error?.message === 'string' &&
  error.message.includes('is not a function')

/**
 * Wrapper hook to facilitate Reown wallet connections for
 * the purpose of signing in or signing up. Handles a few discovered bugs.
 *
 * @param args.onSuccess handler for when connected successfully
 * @param args.onError handler for when an error occurs
 * @returns a connect function that connects to the given wallet
 */
export const useExternalWalletAuth = ({
  onSuccess,
  onError
}: {
  onSuccess: (args: ParsedCaipAddress) => void | Promise<void>
  onError: (e: unknown) => void
}) => {
  const { disconnect } = useDisconnect()

  const onConnectInternal = useCallback(
    async (args: ParsedCaipAddress) => {
      try {
        /**
         * Temporary workaround to bug in Wagmi.
         * Waits for the chain to actually switch to Audius
         * @see {@link https://github.com/wevm/wagmi/issues/4600}
         */
        let unsubscribeNetwork: (() => void) | undefined
        const networkPromise = new Promise<void>((resolve) => {
          unsubscribeNetwork = appkitModal.subscribeNetwork((newState) => {
            if (newState.chainId === audiusChain.id) {
              console.debug('Chain ID changed.')
              resolve()
            }
          })
        })

        // Ensure we're on the Audius chain
        console.debug('Switching chains...')
        try {
          await appkitModal.switchNetwork(audiusChain)
        } catch (error) {
          /**
           * Temporary workaround to bug in MetaMask.
           * @see {@link https://github.com/MetaMask/metamask-extension/issues/31464}
           */
          if (isMetaMaskBug(error)) {
            console.warn('Skipping Metamask Bug:', error)
          } else {
            throw error
          }
        }

        await networkPromise
        unsubscribeNetwork?.()

        await onSuccess(args)
      } catch (e) {
        onError(e)
      }
    },
    [onSuccess, onError]
  )

  const { connect: connectInternal } = useAppKitWallet({
    onSuccess: (wallet) => onConnectInternal(wallet),
    onError
  })

  const connect = useCallback(
    async (wallet: Wallet) => {
      await disconnect()
      // Temporary workaround to metamask bug - start with mainnet then switch
      await appkitModal.switchNetwork(mainnet)
      connectInternal(wallet)
    },
    [connectInternal, disconnect]
  )

  return { connect }
}
