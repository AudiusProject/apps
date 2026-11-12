import { AUDIO, AudioWei, wAUDIO } from '@audius/fixed-decimal'
import {
  type AudiusSdkWithServices,
  Id,
  HedgehogWalletNotFoundError,
  encodeHashId
} from '@audius/sdk'
import type {
  PublicKey,
  Transaction,
  VersionedTransaction
} from '@solana/web3.js'

import { userMetadataToSdk } from '~/adapters/user'
import { Env } from '~/services/env'
import dayjs from '~/utils/dayjs'

import { ID, ComputedUserProperties, WriteableUserMetadata } from '../../models'
import { AnalyticsEvent } from '../../models/Analytics'
import * as schemas from '../../schemas'
import {
  FeatureFlags,
  RemoteConfigInstance
} from '../../services/remote-config'
import {
  BrowserNotificationSetting,
  PushNotificationSetting,
  PushNotifications
} from '../../store'
import { getErrorMessage, Maybe, Nullable } from '../../utils'
import type { LocalStorage } from '../auth/hedgehogLib'

import type { SolanaBackend } from './solanaBackend'

type DisplayEncoding = 'utf8' | 'hex'
type PhantomEvent = 'disconnect' | 'connect' | 'accountChanged'
type PhantomRequestMethod =
  | 'connect'
  | 'disconnect'
  | 'signTransaction'
  | 'signAllTransactions'
  | 'signMessage'

interface ConnectOpts {
  onlyIfTrusted: boolean
}
export interface PhantomProvider {
  publicKey: PublicKey | null
  isConnected: boolean | null
  isPhantom: boolean
  signTransaction: (transaction: Transaction) => Promise<Transaction>
  signAndSendTransaction: (
    transaction: Transaction | VersionedTransaction
  ) => Promise<Transaction>
  signAllTransactions: (transactions: Transaction[]) => Promise<Transaction[]>
  signMessage: (
    message: Uint8Array | string,
    display?: DisplayEncoding
  ) => Promise<any>
  connect: (opts?: Partial<ConnectOpts>) => Promise<{ publicKey: PublicKey }>
  disconnect: () => Promise<void>
  on: (event: PhantomEvent, handler: (args: any) => void) => void
  request: (method: PhantomRequestMethod, params: any) => Promise<unknown>
}
declare global {
  interface Window {
    web3Loaded: boolean
    phantom: any
    solana: PhantomProvider
    Web3: any
  }
}

export const AuthHeaders = Object.freeze({
  Message: 'Encoded-Data-Message',
  Signature: 'Encoded-Data-Signature'
})

type AudiusBackendSolanaConfig = Partial<{
  claimableTokenPda: string
  claimableTokenProgramAddress: string
  rewardsManagerProgramId: string
  rewardsManagerProgramPda: string
  rewardsManagerTokenPda: string
  paymentRouterProgramId: string
  solanaClusterEndpoint: string
  solanaFeePayerAddress: string
  solanaTokenAddress: string
  waudioMintAddress: string
  usdcMintAddress: string
  wormholeAddress: string
}>

type AudiusBackendParams = {
  claimDistributionContractAddress: Maybe<string>
  env: Env
  ethOwnerWallet: Maybe<string>
  ethProviderUrls: Maybe<string[]>
  ethRegistryAddress: Maybe<string>
  ethTokenAddress: Maybe<string>
  getFeatureEnabled: (
    flag: FeatureFlags,
    fallbackFlag?: FeatureFlags
  ) => Promise<boolean | null> | null | boolean
  getHostUrl: () => Nullable<string>
  identityServiceUrl: Maybe<string>
  isElectron: Maybe<boolean>
  localStorage?: LocalStorage
  nativeMobile: Maybe<boolean>
  recaptchaSiteKey: Maybe<string>
  recordAnalytics: (event: AnalyticsEvent, callback?: () => void) => void
  reportError: (args: { error: Error }) => void | Promise<void>
  registryAddress: Maybe<string>
  entityManagerAddress: Maybe<string>
  remoteConfigInstance: RemoteConfigInstance
  setLocalStorageItem: (key: string, value: string) => Promise<void>
  solanaConfig: AudiusBackendSolanaConfig
}

export const audiusBackend = ({
  identityServiceUrl,
  nativeMobile,
  reportError,
  env
}: AudiusBackendParams) => {
  let solanaBackendPromise: Promise<SolanaBackend> | null = null
  const loadSolanaBackend = () => {
    if (!solanaBackendPromise) {
      solanaBackendPromise = import('./solanaBackend').then(
        ({ createSolanaBackend }) => createSolanaBackend({ env, reportError }),
        (e) => {
          // Allow a retry after a failed chunk load
          solanaBackendPromise = null
          throw e
        }
      )
    }
    return solanaBackendPromise
  }

  async function findAssociatedTokenAddress(
    ...args: Parameters<SolanaBackend['findAssociatedTokenAddress']>
  ) {
    return (await loadSolanaBackend()).findAssociatedTokenAddress(...args)
  }

  async function getAddressSolBalance(
    ...args: Parameters<SolanaBackend['getAddressSolBalance']>
  ) {
    return (await loadSolanaBackend()).getAddressSolBalance(...args)
  }

  async function getAddressWAudioBalance(
    ...args: Parameters<SolanaBackend['getAddressWAudioBalance']>
  ) {
    return (await loadSolanaBackend()).getAddressWAudioBalance(...args)
  }

  async function getAssociatedTokenAccountInfo(
    ...args: Parameters<SolanaBackend['getAssociatedTokenAccountInfo']>
  ) {
    return (await loadSolanaBackend()).getAssociatedTokenAccountInfo(...args)
  }

  async function sendTokens(...args: Parameters<SolanaBackend['sendTokens']>) {
    return (await loadSolanaBackend()).sendTokens(...args)
  }

  async function updateCreator({
    metadata,
    sdk
  }: {
    metadata: WriteableUserMetadata &
      Pick<
        ComputedUserProperties,
        'updatedProfilePicture' | 'updatedCoverPhoto'
      >
    sdk: AudiusSdkWithServices
  }) {
    let newMetadata = { ...metadata }
    try {
      newMetadata = schemas.newUserMetadata(newMetadata, true)
      const userId = newMetadata.user_id
      await sdk.users.updateUser({
        id: Id.parse(userId),
        userId: Id.parse(userId),
        profilePictureFile: metadata.updatedProfilePicture?.file,
        coverArtFile: metadata.updatedCoverPhoto?.file,
        metadata: userMetadataToSdk(newMetadata)
      })
      return { userId }
    } catch (err) {
      console.error(getErrorMessage(err))
      throw err
    }
  }

  async function instagramHandle(_: string) {
    return null
  }

  async function tiktokHandle(_: string) {
    return null
  }

  async function getEmailNotificationSettings({
    sdk
  }: {
    sdk: AudiusSdkWithServices
  }) {
    try {
      const { data, signature } = await signIdentityServiceRequest({ sdk })
      const res = await fetch(`${identityServiceUrl}/notifications/settings`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          [AuthHeaders.Message]: data,
          [AuthHeaders.Signature]: signature
        }
      }).then((res) => res.json())
      return res
    } catch (e) {
      console.error(e)
    }
  }

  async function updateEmailNotificationSettings({
    sdk,
    emailFrequency,
    userId
  }: {
    sdk: AudiusSdkWithServices
    emailFrequency: string
    userId: ID
  }) {
    try {
      const { data, signature } = await signIdentityServiceRequest({ sdk })
      const res = await fetch(
        `${identityServiceUrl}/notifications/settings?user_id=${userId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            [AuthHeaders.Message]: data,
            [AuthHeaders.Signature]: signature
          },
          body: JSON.stringify({ settings: { emailFrequency } })
        }
      ).then((res) => res.json())
      return res
    } catch (e) {
      console.error(e)
    }
  }

  async function updateNotificationSettings({
    sdk,
    settings
  }: {
    sdk: AudiusSdkWithServices
    settings: Partial<Record<BrowserNotificationSetting, boolean>>
  }) {
    try {
      const { data, signature } = await signIdentityServiceRequest({ sdk })
      return await fetch(
        `${identityServiceUrl}/push_notifications/browser/settings`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            [AuthHeaders.Message]: data,
            [AuthHeaders.Signature]: signature
          },
          body: JSON.stringify({ settings })
        }
      ).then((res) => res.json())
    } catch (e) {
      console.error(e)
    }
  }

  async function updatePushNotificationSettings({
    sdk,
    settings
  }: {
    sdk: AudiusSdkWithServices
    settings: Partial<Record<PushNotificationSetting, boolean>>
  }) {
    try {
      const { data, signature } = await signIdentityServiceRequest({ sdk })
      return await fetch(`${identityServiceUrl}/push_notifications/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [AuthHeaders.Message]: data,
          [AuthHeaders.Signature]: signature
        },
        body: JSON.stringify({ settings })
      }).then((res) => res.json())
    } catch (e) {
      console.error(e)
    }
  }

  async function signData({
    sdk,
    data
  }: {
    sdk: AudiusSdkWithServices
    data: string
  }) {
    try {
      const signature = await sdk.services.audiusWalletClient.signMessage({
        message: data
      })
      return { data, signature }
    } catch (e) {
      // Don't log an error for HedgehogWalletNotFoundError as it's expected when user is logged out
      if (!(e instanceof HedgehogWalletNotFoundError)) {
        console.error(e)
        reportError({ error: e as Error })
      }
      return { data, signature: '' }
    }
  }

  async function signGatedContentRequest({
    sdk
  }: {
    sdk: AudiusSdkWithServices
  }) {
    const data = `Gated content user signature at ${Date.now()}`
    return await signData({ sdk, data })
  }

  async function signIdentityServiceRequest({
    sdk
  }: {
    sdk: AudiusSdkWithServices
  }) {
    const unixTs = Math.round(new Date().getTime() / 1000) // current unix timestamp (sec)
    const data = `Click sign to authenticate with identity service: ${unixTs}`
    return await signData({ sdk, data })
  }

  /**
   * Records a first-party internal notification campaign push open via the validator node API.
   * Fire-and-forget; failures are logged and swallowed.
   */
  async function reportNotificationCampaignPushOpen({
    sdk,
    userId,
    campaignId
  }: {
    sdk: AudiusSdkWithServices
    userId: number
    campaignId: string
  }) {
    try {
      const { data, signature } = await signAPIRequest({ sdk })
      if (!signature) {
        return
      }
      const encodedUserId = encodeHashId(userId)
      if (!encodedUserId) {
        return
      }
      const base = env.API_URL.replace(/\/$/, '')
      const annId = encodeURIComponent(campaignId)
      const url = `${base}/v1/users/${encodedUserId}/notifications/campaigns/${annId}/open`
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [AuthHeaders.Message]: data,
          [AuthHeaders.Signature]: signature
        }
      })
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        console.warn(
          'reportNotificationCampaignPushOpen failed',
          res.status,
          text.slice(0, 200)
        )
      }
    } catch (e) {
      console.warn('reportNotificationCampaignPushOpen', e)
    }
  }

  async function pingActivity({
    sdk,
    userId
  }: {
    sdk: AudiusSdkWithServices
    userId: number
  }) {
    try {
      const { data, signature } = await signAPIRequest({ sdk })
      if (!signature) return
      const encodedUserId = encodeHashId(userId)
      if (!encodedUserId) return
      const base = env.API_URL.replace(/\/$/, '')
      await fetch(`${base}/v1/users/me/ping?user_id=${encodedUserId}`, {
        method: 'POST',
        headers: {
          [AuthHeaders.Message]: data,
          [AuthHeaders.Signature]: signature
        }
      })
    } catch {
      // Fire-and-forget
    }
  }

  async function signAPIRequest({
    sdk,
    input
  }: {
    sdk: AudiusSdkWithServices
    input?: any
  }) {
    let data
    if (input) {
      data = input
    } else {
      const unixTs = Math.round(new Date().getTime() / 1000) // current unix timestamp (sec)
      data = `Click sign to authenticate with API: ${unixTs}`
    }
    return await signData({ sdk, data })
  }

  async function getBrowserPushNotificationSettings({
    sdk
  }: {
    sdk: AudiusSdkWithServices
  }) {
    try {
      const { data, signature } = await signIdentityServiceRequest({ sdk })
      return await fetch(
        `${identityServiceUrl}/push_notifications/browser/settings`,
        {
          headers: {
            [AuthHeaders.Message]: data,
            [AuthHeaders.Signature]: signature
          }
        }
      )
        .then((res) => res.json())
        .then((res) => res.settings)
    } catch (e) {
      console.error(e)
      return null
    }
  }

  async function getBrowserPushSubscription({
    sdk,
    pushEndpoint
  }: {
    sdk: AudiusSdkWithServices
    pushEndpoint: string
  }) {
    try {
      const { data, signature } = await signIdentityServiceRequest({ sdk })
      const endpiont = encodeURIComponent(pushEndpoint)
      return await fetch(
        `${identityServiceUrl}/push_notifications/browser/enabled?endpoint=${endpiont}`,
        {
          headers: {
            [AuthHeaders.Message]: data,
            [AuthHeaders.Signature]: signature
          }
        }
      )
        .then((res) => res.json())
        .then((res) => res.enabled)
    } catch (e) {
      console.error(e)
      return null
    }
  }

  async function getSafariBrowserPushEnabled({
    sdk,
    deviceToken
  }: {
    sdk: AudiusSdkWithServices
    deviceToken: string
  }) {
    try {
      const { data, signature } = await signIdentityServiceRequest({ sdk })
      return await fetch(
        `${identityServiceUrl}/push_notifications/device_token/enabled?deviceToken=${deviceToken}&deviceType=safari`,
        {
          headers: {
            [AuthHeaders.Message]: data,
            [AuthHeaders.Signature]: signature
          }
        }
      )
        .then((res) => res.json())
        .then((res) => res.enabled)
    } catch (e) {
      console.error(e)
      return null
    }
  }

  async function updateBrowserNotifications({
    sdk,
    enabled = true,
    subscription
  }: {
    sdk: AudiusSdkWithServices
    enabled: boolean
    subscription: PushSubscription
  }) {
    const { data, signature } = await signIdentityServiceRequest({ sdk })
    return await fetch(
      `${identityServiceUrl}/push_notifications/browser/register`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [AuthHeaders.Message]: data,
          [AuthHeaders.Signature]: signature
        },
        body: JSON.stringify({ enabled, subscription })
      }
    ).then((res) => res.json())
  }

  async function disableBrowserNotifications({
    sdk,
    subscription
  }: {
    sdk: AudiusSdkWithServices
    subscription: PushSubscription
  }) {
    const { data, signature } = await signIdentityServiceRequest({ sdk })
    return await fetch(
      `${identityServiceUrl}/push_notifications/browser/deregister`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [AuthHeaders.Message]: data,
          [AuthHeaders.Signature]: signature
        },
        body: JSON.stringify({ subscription })
      }
    ).then((res) => res.json())
  }

  async function getPushNotificationSettings({
    sdk
  }: {
    sdk: AudiusSdkWithServices
  }) {
    try {
      const { data, signature } = await signIdentityServiceRequest({ sdk })
      return await fetch(`${identityServiceUrl}/push_notifications/settings`, {
        headers: {
          [AuthHeaders.Message]: data,
          [AuthHeaders.Signature]: signature
        }
      })
        .then((res) => res.json())
        .then((res: { settings: PushNotifications }) => res.settings)
    } catch (e) {
      console.error(e)
      return null
    }
  }

  async function registerDeviceToken({
    sdk,
    deviceToken,
    deviceType
  }: {
    sdk: AudiusSdkWithServices
    deviceToken: string
    deviceType: string
  }) {
    try {
      const { data, signature } = await signIdentityServiceRequest({ sdk })
      return await fetch(
        `${identityServiceUrl}/push_notifications/device_token`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            [AuthHeaders.Message]: data,
            [AuthHeaders.Signature]: signature
          },
          body: JSON.stringify({
            deviceToken,
            deviceType
          })
        }
      ).then((res) => res.json())
    } catch (e) {
      console.error(e)
    }
  }

  async function deregisterDeviceToken({
    sdk,
    deviceToken
  }: {
    sdk: AudiusSdkWithServices
    deviceToken: string
  }) {
    try {
      const { data, signature } = await signIdentityServiceRequest({ sdk })
      return await fetch(
        `${identityServiceUrl}/push_notifications/device_token/deregister`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            [AuthHeaders.Message]: data,
            [AuthHeaders.Signature]: signature
          },
          body: JSON.stringify({
            deviceToken
          })
        }
      ).then((res) => res.json())
    } catch (e) {
      console.error(e)
    }
  }

  async function updateUserLocationTimezone({
    sdk
  }: {
    sdk: AudiusSdkWithServices
  }) {
    try {
      const { data, signature } = await signIdentityServiceRequest({ sdk })
      const timezone = dayjs.tz.guess()
      const res = await fetch(`${identityServiceUrl}/users/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [AuthHeaders.Message]: data,
          [AuthHeaders.Signature]: signature
        },
        body: JSON.stringify({ timezone })
      }).then((res) => res.json())
      return res
    } catch (e) {
      console.error(e)
    }
  }

  async function sendWelcomeEmail({
    sdk,
    name
  }: {
    sdk: AudiusSdkWithServices
    name: string
  }) {
    try {
      const { data, signature } = await signIdentityServiceRequest({ sdk })
      return await fetch(`${identityServiceUrl}/email/welcome`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [AuthHeaders.Message]: data,
          [AuthHeaders.Signature]: signature
        },
        body: JSON.stringify({ name, isNativeMobile: !!nativeMobile })
      }).then((res) => res.json())
    } catch (e) {
      console.error(e)
    }
  }

  async function updateUserEvent({
    sdk,
    hasSignedInNativeMobile
  }: {
    sdk: AudiusSdkWithServices
    hasSignedInNativeMobile: boolean
  }) {
    try {
      const { data, signature } = await signIdentityServiceRequest({ sdk })
      const res = await fetch(`${identityServiceUrl}/userEvents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [AuthHeaders.Message]: data,
          [AuthHeaders.Signature]: signature
        },
        body: JSON.stringify({ hasSignedInNativeMobile })
      }).then((res) => res.json())
      return res
    } catch (e) {
      console.error(e)
    }
  }

  async function updateHCaptchaScore({
    sdk,
    token
  }: {
    sdk: AudiusSdkWithServices
    token: string
  }) {
    try {
      const { data, signature } = await signIdentityServiceRequest({ sdk })
      return await fetch(`${identityServiceUrl}/score/hcaptcha`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [AuthHeaders.Message]: data,
          [AuthHeaders.Signature]: signature
        },
        body: JSON.stringify({ token })
      }).then((res) => res.json())
    } catch (err) {
      console.error(getErrorMessage(err))
      return { error: true }
    }
  }

  /**
   * Make a request to fetch the eth AUDIO balance of the the user
   * @params {bool} bustCache
   * @params {string} ethAddress - Optional ETH wallet address. Defaults to hedgehog wallet
   * @returns {Promise<AudioWei | null>} balance or null if failed to fetch balance
   */
  async function getBalance({
    ethAddress,
    sdk
  }: {
    ethAddress: string
    sdk: AudiusSdkWithServices
  }): Promise<AudioWei | null> {
    if (!ethAddress) return null

    try {
      const { getAddress } = await import('viem')
      const checksumWallet = getAddress(ethAddress)
      const balance = await sdk.services.ethereum.audiusToken.read.balanceOf([
        checksumWallet
      ])
      return AUDIO(balance).value
    } catch (e) {
      console.error(e)
      reportError({ error: e as Error })
      return null
    }
  }

  /**
   * Make a request to fetch the sol wrapped audio balance of the the user
   * @params {string} ethAddress - Optional ETH wallet address to derive user bank. Defaults to hedgehog wallet
   * @returns {Promise<AudioWei>} balance or null if failed to fetch balance
   */
  async function getWAudioBalance({
    ethAddress,
    sdk
  }: {
    ethAddress: string
    sdk: AudiusSdkWithServices
  }): Promise<AudioWei | null> {
    try {
      const userBank = await sdk.services.claimableTokensClient.deriveUserBank({
        ethWallet: ethAddress,
        mint: 'wAUDIO'
      })
      const connection = await sdk.services.solanaClient.getConnection()
      let balance = BigInt(0)
      try {
        const {
          value: { amount }
        } = await connection.getTokenAccountBalance(userBank)
        balance = BigInt(amount)
      } catch (e) {
        console.error(e)
      }
      const ownerWAudioBalance = AUDIO(wAUDIO(balance)).value
      return ownerWAudioBalance
    } catch (e) {
      console.error(e)
      reportError({ error: e as Error })
      return null
    }
  }

  /**
   * Make a request to fetch the balance, staked and delegated total of the wallet address
   * @param address The wallet address to fetch the balance for
   * @param bustCache
   * @returns balance or null if error
   */
  async function getAddressTotalStakedBalance(
    address: string,
    sdk: AudiusSdkWithServices
  ) {
    if (!address) return null

    try {
      const { getAddress } = await import('viem')
      const checksumWallet = getAddress(address)
      const ethereum = sdk.services.ethereum
      const [balance, stakedBalance, delegatedBalance] = await Promise.all([
        ethereum.audiusToken.read.balanceOf([checksumWallet]),
        ethereum.staking.read.totalStakedFor([checksumWallet]),
        ethereum.delegateManager.read.getTotalDelegatorStake([checksumWallet])
      ])
      return AUDIO(balance + stakedBalance + delegatedBalance).value
    } catch (e) {
      reportError({ error: e as Error })
      console.error(e)
      return null
    }
  }

  async function getSignature({
    data,
    sdk
  }: {
    data: any
    sdk: AudiusSdkWithServices
  }) {
    return signData({ data, sdk })
  }

  return {
    deregisterDeviceToken,
    disableBrowserNotifications,
    findAssociatedTokenAddress,
    getAddressTotalStakedBalance,
    getAddressWAudioBalance,
    getAddressSolBalance,
    getAssociatedTokenAccountInfo,
    getBalance,
    getBrowserPushNotificationSettings,
    getBrowserPushSubscription,
    getEmailNotificationSettings,
    getPushNotificationSettings,
    getSafariBrowserPushEnabled,
    getSignature,
    getWAudioBalance,
    identityServiceUrl,
    pingActivity,
    registerDeviceToken,
    reportNotificationCampaignPushOpen,
    sendTokens,
    sendWelcomeEmail,
    signData,
    signGatedContentRequest,
    signAPIRequest,
    signIdentityServiceRequest,
    instagramHandle,
    tiktokHandle,
    updateBrowserNotifications,
    updateCreator,
    updateEmailNotificationSettings,
    updateHCaptchaScore,
    updateNotificationSettings,
    updatePushNotificationSettings,
    updateUserEvent,
    updateUserLocationTimezone
  }
}

export type AudiusBackend = ReturnType<typeof audiusBackend>
