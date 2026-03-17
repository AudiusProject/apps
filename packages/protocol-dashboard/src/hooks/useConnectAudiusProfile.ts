import { useCallback, useState } from 'react'

import { useQueryClient } from '@tanstack/react-query'
import { useDispatch } from 'react-redux'

import { getDashboardWalletUserQueryKey } from 'hooks/useDashboardWalletUsers'
import { audiusSdk as sdk } from 'services/Audius/sdk'
import { disableAudiusProfileRefetch } from 'store/account/slice'

/**
 * Connect/disconnect Audius profile: write-once style flow.
 * Only the specific action is authorized — no persistent write grant is created.
 * The app does not receive ongoing write access to the user's account.
 */
const OAUTH_ORIGINS = [
  'https://audius.co',
  'https://staging.audius.co',
  'http://localhost:3000'
]

const messages = {
  connectFailed: "Couldn't fetch Audius profile data.",
  signRejected: 'Wallet signature was rejected.'
}

export const useConnectAudiusProfile = ({
  wallet,
  onSuccess
}: {
  wallet: string
  onSuccess: () => void
}) => {
  const queryClient = useQueryClient()
  const dispatch = useDispatch()
  const [isWaiting, setIsWaiting] = useState(false)

  const handleConnectSuccess = useCallback(async () => {
    await queryClient.cancelQueries({
      queryKey: getDashboardWalletUserQueryKey(wallet)
    })
    dispatch(disableAudiusProfileRefetch())

    try {
      const profile = await sdk.oauth.getUser()
      if (profile?.userId) {
        const audiusUser = await sdk.users.getUser({ id: profile.userId })
        if (audiusUser?.data) {
          queryClient.setQueryData(getDashboardWalletUserQueryKey(wallet), {
            wallet,
            user: audiusUser.data
          })
        }
      }
      onSuccess()
    } catch {
      console.error(messages.connectFailed)
    } finally {
      setIsWaiting(false)
    }
  }, [queryClient, dispatch, wallet, onSuccess])

  const connect = async () => {
    setIsWaiting(true)

    // OAuth page (audius.co) requests wallet signature via postMessage; we respond here
    const walletSignatureHandler = async (event: MessageEvent) => {
      if (
        !OAUTH_ORIGINS.some((o) => event.origin === o) ||
        !event.data?.state ||
        event.data.userHandle == null
      ) {
        return
      }
      if (sdk.oauth.activePopupWindow != null) {
        try {
          const message = `Connecting Audius user @${event.data.userHandle} at ${Math.round(
            new Date().getTime() / 1000
          )}`
          const signature =
            await window.audiusLibs?.web3Manager?.sign?.(message)
          if (signature != null && event.source != null) {
            ;(event.source as Window).postMessage(
              {
                state: event.data.state,
                walletSignature: { message, signature }
              },
              event.origin
            )
          }
        } catch {
          // Sign rejected by user
        }
      }
    }
    window.addEventListener('message', walletSignatureHandler, false)

    try {
      await sdk.oauth.login({
        scope: 'write',
        display: 'popup',
        params: {
          tx: 'connect_dashboard_wallet',
          wallet
        }
      })
      await handleConnectSuccess()
    } catch (error) {
      console.error(
        error instanceof Error ? error.message : messages.signRejected
      )
      setIsWaiting(false)
    } finally {
      window.removeEventListener('message', walletSignatureHandler)
    }
  }

  const handleDisconnectSuccess = async () => {
    await queryClient.cancelQueries({
      queryKey: getDashboardWalletUserQueryKey(wallet)
    })
    dispatch(disableAudiusProfileRefetch())
    queryClient.setQueryData(getDashboardWalletUserQueryKey(wallet), null)
    setIsWaiting(false)
    onSuccess()
  }

  const disconnect = async () => {
    setIsWaiting(true)
    try {
      await sdk.oauth.login({
        scope: 'write',
        display: 'popup',
        params: {
          tx: 'disconnect_dashboard_wallet',
          wallet
        }
      })
      await handleDisconnectSuccess()
    } catch (error) {
      console.error(
        error instanceof Error ? error.message : messages.signRejected
      )
      setIsWaiting(false)
    }
  }

  return { connect, disconnect, isWaiting }
}
