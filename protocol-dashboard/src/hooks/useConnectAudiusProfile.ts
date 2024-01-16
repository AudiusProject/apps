import { DecodedUserToken, OAUTH_URL } from '@audius/sdk'
import { useQueryClient } from '@tanstack/react-query'
import { getDashboardWalletUserQueryKey } from 'hooks/useDashboardWalletUsers'
import { useDispatch } from 'react-redux'
import { audiusSdk } from 'services/Audius/sdk'
import { disableAudiusProfileRefetch } from 'store/account/slice'

const env = import.meta.env.VITE_ENVIRONMENT

let resolveUserHandle = null
let receiveUserHandlePromise = null

const receiveUserId = async (event: MessageEvent) => {
  const sdk = await audiusSdk()
  const oauthOrigin = new URL(OAUTH_URL[env]).origin
  if (
    event.origin !== oauthOrigin ||
    event.source !== sdk.oauth.activePopupWindow ||
    !event.data.state
  ) {
    return
  }
  if (sdk.oauth.getCsrfToken() !== event.data.state) {
    console.error('State mismatch.')
    return
  }
  if (event.data.userHandle != null) {
    resolveUserHandle(event.data.userHandle)
  }
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
  const handleConnectSuccess = async (profile: DecodedUserToken) => {
    window.removeEventListener('message', receiveUserId)
    const sdk = await audiusSdk()

    // Optimistically set user
    await queryClient.cancelQueries({
      queryKey: getDashboardWalletUserQueryKey(wallet)
    })
    dispatch(disableAudiusProfileRefetch())

    try {
      const audiusUser = await sdk.users.getUser({ id: profile.userId })
      if (audiusUser?.data) {
        queryClient.setQueryData(getDashboardWalletUserQueryKey(wallet), {
          wallet,
          user: audiusUser.data
        })
      }
      onSuccess()
    } catch {
      console.error("Couldn't fetch Audius profile data.")
    }
  }

  const connect = async () => {
    const sdk = await audiusSdk()
    sdk.oauth.init({
      env: env === 'production' ? 'production' : 'staging',
      successCallback: handleConnectSuccess,
      errorCallback: (errorMessage: string) => {
        window.removeEventListener('message', receiveUserId)
        console.error(errorMessage)
      }
    })
    window.removeEventListener('message', receiveUserId)
    receiveUserHandlePromise = new Promise(resolve => {
      resolveUserHandle = resolve
    })
    window.addEventListener('message', receiveUserId, false)
    sdk.oauth.login({
      scope: 'write_once',
      params: {
        tx: 'connect_dashboard_wallet',
        wallet
      }
    })

    // Leg 1: Receive Audius user id from OAuth popup
    const userHandle = await receiveUserHandlePromise
    // Sign wallet signature from EM transaction
    const message = `Connecting Audius user @${userHandle} at ${Math.round(
      new Date().getTime() / 1000
    )}`
    const signature = await window.audiusLibs.web3Manager.sign(message)

    const walletSignature = { message, signature }
    // Leg 2: Send wallet signature to OAuth popup
    sdk.oauth.activePopupWindow.postMessage(
      { state: sdk.oauth.getCsrfToken(), walletSignature },
      new URL(OAUTH_URL[env]).origin
    )
  }

  const handleDisconnectSuccess = async () => {
    // Optimistically clear the connected user
    await queryClient.cancelQueries({
      queryKey: getDashboardWalletUserQueryKey(wallet)
    })
    dispatch(disableAudiusProfileRefetch())
    queryClient.setQueryData(getDashboardWalletUserQueryKey(wallet), null)
    onSuccess()
  }

  const disconnect = async () => {
    const sdk = await audiusSdk()
    sdk.oauth.init({
      env: env === 'production' ? 'production' : 'staging',
      successCallback: handleDisconnectSuccess,
      errorCallback: (errorMessage: string) => {
        console.error(errorMessage)
      }
    })
    sdk.oauth.login({
      scope: 'write_once',
      params: {
        tx: 'disconnect_dashboard_wallet',
        wallet
      }
    })
  }

  return { connect, disconnect }
}
