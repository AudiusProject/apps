import { useCallback } from 'react'

import { isResponseError } from '@audius/common/src/utils/error'
import type { AudiusSdk } from '@audius/sdk'
import { mainnet } from '@reown/appkit/networks'
import { useDisconnect } from '@reown/appkit/react'
import type { ParsedCaipAddress } from '@reown/appkit-common'
import { useAppKitWallet, type Wallet } from '@reown/appkit-wallet-button/react'

import { appkitModal, audiusChain } from 'app/ReownAppKitModal'

export const doesUserExist = async (sdk: AudiusSdk, wallet: string) => {
  try {
    const { data } = await sdk.users.getUserAccount({
      wallet
    })
    if (data?.user) {
      return true
    }
  } catch (e) {
    if (!isResponseError(e) || e.response.status !== 401) {
      throw e
    }
  }
  return false
}

const isMetaMaskBug = (error: unknown) =>
  error instanceof Object &&
  'message' in error &&
  typeof error?.message === 'string' &&
  error.message.includes('is not a function')

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
        let unsubscribeNetwork: (() => void) | undefined
        const networkPromise = new Promise<void>((resolve) => {
          unsubscribeNetwork = appkitModal.subscribeNetwork((newState) => {
            if (newState.chainId === audiusChain.id) {
              console.debug('Chain ID changed.')
              resolve()
            }
          })
        })

        console.debug('Switching chains...')
        try {
          await appkitModal.switchNetwork(audiusChain)
        } catch (error) {
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
      await appkitModal.switchNetwork(mainnet)
      connectInternal(wallet)
    },
    [connectInternal, disconnect]
  )

  return { connect }
}
