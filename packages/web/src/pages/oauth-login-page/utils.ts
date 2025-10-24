import { UserMetadata } from '@audius/common/models'
import { getErrorMessage } from '@audius/common/utils'
import { CreateGrantRequest, HashId, Id, OptionalId } from '@audius/sdk'
import base64url from 'base64url'

import { audiusBackendInstance } from 'services/audius-backend/audius-backend-instance'
import { audiusSdk } from 'services/audius-sdk'
import { identityService } from 'services/audius-sdk/identity'

import { messages } from './messages'

export const getIsRedirectValid = ({
  parsedRedirectUri,
  redirectUri
}: {
  parsedRedirectUri: 'postmessage' | URL | null
  redirectUri: string | string[] | null
}) => {
  if (redirectUri) {
    if (parsedRedirectUri == null) {
      // This means the redirect uri is not a string (and is thus invalid) or the URI format was invalid
      return false
    }
    if (parsedRedirectUri === 'postmessage') {
      return true
    }
    const { hash, username, password, pathname, hostname, protocol } =
      parsedRedirectUri
    // Ensure that the redirect_uri protocol is http or https
    // IMPORTANT: If this validation is not done, users can
    // use the redirect_uri to execute arbitrary code on the host
    // domain (e.g. audius.co).
    if (protocol !== 'http:' && protocol !== 'https:') {
      return false
    }
    if (hash || username || password) {
      return false
    }
    if (
      pathname.includes('/..') ||
      pathname.includes('\\..') ||
      pathname.includes('../')
    ) {
      return false
    }

    // From https://stackoverflow.com/questions/106179/regular-expression-to-match-dns-hostname-or-ip-address:
    const ipRegex =
      /^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$/
    const localhostIPv4Regex =
      /^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/
    // Disallow IP addresses as redirect URIs unless it's localhost
    if (
      ipRegex.test(hostname) &&
      hostname !== '[::1]' &&
      !localhostIPv4Regex.test(hostname)
    ) {
      return false
    }
    // TODO(nkang): Potentially check URI against malware list like https://urlhaus-api.abuse.ch/#urlinfo
    return true
  } else {
    return false
  }
}

export const isValidApiKey = (key: string | string[]) => {
  if (Array.isArray(key)) return false
  if (key.length !== 40) {
    return false
  }
  const hexadecimalRegex = /^[0-9a-fA-F]+$/
  return hexadecimalRegex.test(key)
}

const getFormattedAppAddress = ({
  apiKey,
  includePrefix
}: {
  apiKey: string
  includePrefix: boolean
}) => {
  let result
  if (!apiKey.startsWith('0x')) {
    if (includePrefix) {
      result = `0x${apiKey}`
    } else {
      result = apiKey
    }
  } else {
    if (includePrefix) {
      result = apiKey
    } else {
      result = apiKey.slice(2)
    }
  }
  return result.toLowerCase()
}

export const formOAuthResponse = async ({
  account,
  userEmail,
  apiKey,
  onError,
  txSignature // Only applicable to scope = write_once
}: {
  account: UserMetadata
  userEmail?: string | null
  apiKey: string | string[] | null
  onError: () => void
  txSignature?: { message: string; signature: string }
}) => {
  let email: string
  if (!userEmail) {
    try {
      email = await identityService.getUserEmail()
    } catch {
      onError()
      return
    }
  } else {
    email = userEmail
  }

  const profilePicture = account.profile_picture
  const timestamp = Math.round(new Date().getTime() / 1000)
  const userId = OptionalId.parse(account?.user_id)
  const response = {
    userId,
    email,
    name: account?.name,
    handle: account?.handle,
    verified: account?.is_verified,
    profilePicture,
    apiKey,
    ...(txSignature ? { txSignature } : {}),
    sub: userId,
    iat: timestamp
  }
  const header = base64url.encode(
    JSON.stringify({ typ: 'JWT', alg: 'keccak256' })
  )
  const payload = base64url.encode(JSON.stringify(response))

  const message = `${header}.${payload}`
  let signedData: { data: string; signature: string }
  try {
    const sdk = await audiusSdk()
    signedData = await audiusBackendInstance.signAPIRequest({
      sdk,
      input: message
    })
  } catch {
    onError()
    return
  }
  const signature = signedData.signature
  return `${header}.${payload}.${base64url.encode(signature)}`
}

export const authWrite = async ({ userId, appApiKey }: CreateGrantRequest) => {
  const sdk = await audiusSdk()
  await sdk.grants.createGrant({
    userId,
    appApiKey
  })
}

export const getDeveloperApp = async (address: string) => {
  const sdk = await audiusSdk()
  const developerApp = await sdk.developerApps.getDeveloperApp({ address })
  return developerApp.data
}

export const getIsAppAuthorized = async ({
  userId,
  apiKey
}: {
  userId: string
  apiKey: string
}) => {
  const sdk = await audiusSdk()
  const authorizedApps = await sdk.users.getAuthorizedApps({ id: userId })
  const prefixedAppAddress = getFormattedAppAddress({
    apiKey,
    includePrefix: true
  })
  const foundIndex = authorizedApps.data?.findIndex(
    (a) => a.address.toLowerCase() === prefixedAppAddress
  )
  return foundIndex !== undefined && foundIndex > -1
}
export type WriteOnceTx =
  | 'connect_dashboard_wallet'
  | 'disconnect_dashboard_wallet'

type ConnectDashboardWalletParams = {
  wallet: string
}

type DisconnectDashboardWalletParams = {
  wallet: string
}

export type WriteOnceParams =
  | ConnectDashboardWalletParams
  | DisconnectDashboardWalletParams

export const validateWriteOnceParams = ({
  tx,
  params: rawParams,
  willUsePostMessage
}: {
  tx: string | string[] | null
  params: any
  willUsePostMessage: boolean
}) => {
  let error = null
  let txParams: WriteOnceParams | null = null
  if (tx === 'connect_dashboard_wallet') {
    if (!willUsePostMessage) {
      error = messages.connectWalletNoPostMessageError
    }
    if (!rawParams.wallet) {
      error = messages.writeOnceParamsError
      return { error, txParams }
    }
    txParams = {
      wallet: rawParams.wallet
    }
  } else if (tx === 'disconnect_dashboard_wallet') {
    if (!rawParams.wallet) {
      error = messages.writeOnceParamsError
      return { error, txParams }
    }
    txParams = {
      wallet: rawParams.wallet
    }
  } else {
    // Unknown 'tx' value
    error = messages.writeOnceTxError
  }
  return { error, txParams }
}

let walletSignatureListener: ((event: MessageEvent) => void) | null = null

export const handleAuthorizeConnectDashboardWallet = async ({
  state,
  originUrl,
  onError,
  onWaitForWalletSignature,
  onReceivedWalletSignature,
  account,
  txParams
}: {
  state: string | string[] | null
  originUrl: URL | null
  onError: ({
    isUserError,
    errorMessage,
    error
  }: {
    isUserError: boolean
    errorMessage: string
    error?: Error
  }) => void
  onWaitForWalletSignature: () => void
  onReceivedWalletSignature: () => void
  account: UserMetadata
  txParams: ConnectDashboardWalletParams
}) => {
  if (!window.opener || !originUrl) {
    onError({
      isUserError: false,
      errorMessage: messages.noWindowError
    })
    return false
  }

  let resolveWalletSignature:
    | ((value: { message: string; signature: string }) => void)
    | null = null
  const receiveWalletSignaturePromise = new Promise<{
    message: string
    signature: string
  }>((resolve) => {
    resolveWalletSignature = resolve
  })
  walletSignatureListener = (event: MessageEvent) => {
    if (
      event.origin !== originUrl.origin ||
      event.source !== window.opener ||
      !event.data.state
    ) {
      return
    }
    if (state !== event.data.state) {
      console.error('State mismatch.')
      return
    }
    if (event.data.walletSignature != null) {
      if (resolveWalletSignature) {
        if (
          typeof event.data.walletSignature?.message === 'string' &&
          typeof event.data.walletSignature?.signature === 'string'
        ) {
          resolveWalletSignature(event.data.walletSignature)
        } else {
          console.error('Wallet signature received from opener is invalid.')
        }
      }
    }
  }
  window.addEventListener('message', walletSignatureListener, false)

  // Send chosen logged in user info back to origin
  window.opener.postMessage(
    {
      state,
      userId: Id.parse(account.user_id),
      userHandle: account.handle
    },
    originUrl.origin
  )

  // Listen for message from origin containing wallet signature
  onWaitForWalletSignature()
  const walletSignature = await receiveWalletSignaturePromise
  onReceivedWalletSignature()
  window.removeEventListener('message', walletSignatureListener)
  // Send the transaction
  try {
    const sdk = await audiusSdk()
    await sdk.dashboardWalletUsers.connectUserToDashboardWallet({
      userId: Id.parse(account.user_id),
      wallet: txParams!.wallet as `0x${string}`,
      walletSignature
    })
  } catch (e: unknown) {
    const error = getErrorMessage(e)

    onError({
      isUserError: false,
      errorMessage: messages.miscError,
      error: e instanceof Error ? e : new Error(error)
    })
    return false
  }
  return true
}

export const getIsUserConnectedToDashboardWallet = async ({
  userId,
  wallet
}: {
  userId: number
  wallet: string
}) => {
  const sdk = await audiusSdk()
  const res = await sdk.dashboardWalletUsers.bulkGetDashboardWalletUsers({
    wallets: [wallet]
  })
  const dashboardWalletUser = res.data?.[0].user
  if (!dashboardWalletUser) {
    return false
  }
  if (userId !== HashId.parse(dashboardWalletUser.id)) {
    return false
  }
  return true
}

export const handleAuthorizeDisconnectDashboardWallet = async ({
  account,
  txParams,
  onError
}: {
  onError: ({
    isUserError,
    errorMessage,
    error
  }: {
    isUserError: boolean
    errorMessage: string
    error?: Error
  }) => void
  account: UserMetadata
  txParams: DisconnectDashboardWalletParams
}) => {
  const sdk = await audiusSdk()
  try {
    const isCorrectUser = await getIsUserConnectedToDashboardWallet({
      userId: account.user_id,
      wallet: txParams.wallet
    })
    if (!isCorrectUser) {
      onError({
        isUserError: true,
        errorMessage: messages.disconnectDashboardWalletWrongUserError
      })
      return false
    }
    await sdk.dashboardWalletUsers.disconnectUserFromDashboardWallet({
      wallet: txParams.wallet as `0x${string}`,
      userId: Id.parse(account.user_id)
    })
  } catch (e: unknown) {
    const error = getErrorMessage(e)
    onError({
      isUserError: false,
      errorMessage: messages.miscError,
      error: e instanceof Error ? e : new Error(error)
    })
    return false
  }
  return true
}
