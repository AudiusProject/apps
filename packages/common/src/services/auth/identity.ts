import { AudiusWalletClient } from '@audius/sdk'
import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios'

import { TwitterUser } from '~/models'
import { uuid } from '~/utils/uid'

import { AuthHeaders } from './types'

export type RecoveryInfoParams = {
  login: string
  host: string
}

export type IdentityRequestError = AxiosError

type CreateStripeSessionRequest = {
  destinationWallet: string
  amount: string
  destinationCurrency: 'sol' | 'usdc'
}

type CreateStripeSessionResponse = {
  id: string
  client_secret: string
  status: string
}

enum TransactionMetadataType {
  PURCHASE_SOL_AUDIO_SWAP = 'PURCHASE_SOL_AUDIO_SWAP'
}

type InAppAudioPurchaseMetadata = {
  discriminator: TransactionMetadataType.PURCHASE_SOL_AUDIO_SWAP
  usd: string
  sol: string
  audio: string
  purchaseTransactionId: string
  setupTransactionId?: string
  swapTransactionId: string
  cleanupTransactionId?: string
}

export type IdentityServiceConfig = {
  identityServiceEndpoint: string
  getAudiusWalletClient: () => Promise<AudiusWalletClient>
}

export class IdentityService {
  identityServiceEndpoint: string
  getAudiusWalletClient: () => Promise<AudiusWalletClient>

  constructor({
    identityServiceEndpoint,
    getAudiusWalletClient: audiusWalletClient
  }: IdentityServiceConfig) {
    this.identityServiceEndpoint = identityServiceEndpoint
    this.getAudiusWalletClient = audiusWalletClient
  }

  async getAuthHeaders() {
    // Check if auth headers are provided in localStorage (e.g., from mobile WebView)
    // This allows mobile apps to inject auth headers for web authentication
    if (typeof window !== 'undefined' && window.localStorage) {
      const storedMessage = window.localStorage.getItem(AuthHeaders.Message)
      const storedSignature = window.localStorage.getItem(AuthHeaders.Signature)
      if (storedMessage && storedSignature) {
        return {
          [AuthHeaders.Message]: storedMessage,
          [AuthHeaders.Signature]: storedSignature
        }
      }
    }

    const audiusWalletClient = await this.getAudiusWalletClient()
    const [currentAddress] = await audiusWalletClient.getAddresses()
    if (!currentAddress) {
      throw new Error('User is not authenticated')
    }

    const unixTs = Math.round(new Date().getTime() / 1000) // current unix timestamp (sec)
    const message = `Click sign to authenticate with identity service: ${unixTs}`
    const signature = await audiusWalletClient.signMessage({
      message
    })

    return {
      [AuthHeaders.Message]: message,
      [AuthHeaders.Signature]: signature
    }
  }

  // TODO: Use regular `fetch` and same request patterns as SDK
  // Likely this means extending BaseAPI and using request sig middleware
  // But calling code needs to update to follow SDK patterns as well
  private async _makeRequest<T = unknown>(axiosRequestObj: AxiosRequestConfig) {
    axiosRequestObj.baseURL =
      axiosRequestObj.baseURL || this.identityServiceEndpoint

    const requestId = uuid()
    axiosRequestObj.headers = {
      ...(axiosRequestObj.headers || {}),
      'X-Request-ID': requestId
    }

    // Axios throws for non-200 responses
    try {
      const resp: AxiosResponse<T> = await axios(axiosRequestObj)
      if (!resp.data) {
        throw new Error(
          `Identity response missing data field for url: ${axiosRequestObj.url}, req-id: ${requestId}`
        )
      }
      return resp.data
    } catch (e) {
      const error = e as AxiosError
      if (error.response?.data?.error) {
        console.error(
          `Server returned error for requestId ${requestId}: [${error.response.status.toString()}] ${
            error.response.data.error
          }`
        )
      }
      throw error
    }
  }

  async sendRecoveryInfo(args: RecoveryInfoParams) {
    // This endpoint takes data/signature as body params
    const { [AuthHeaders.Message]: data, [AuthHeaders.Signature]: signature } =
      await this.getAuthHeaders()
    return await this._makeRequest<{ status: true }>({
      url: '/recovery',
      method: 'post',
      data: { ...args, data, signature }
    })
  }

  async lookupTwitterHandle(handle: string): Promise<TwitterUser> {
    if (handle) {
      return await this._makeRequest({
        url: '/twitter/handle_lookup',
        method: 'get',
        params: { handle }
      })
    } else {
      throw new Error('No handle passed into function lookupTwitterHandle')
    }
  }

  async associateTwitterUser(
    uuid: string,
    userId: number,
    handle: string,
    blockNumber?: number
  ) {
    return await this._makeRequest({
      url: '/twitter/associate',
      method: 'post',
      data: {
        uuid,
        userId,
        handle,
        blockNumber
      }
    })
  }

  async associateInstagramUser(
    uuid: string,
    userId: number,
    handle: string,
    blockNumber?: number
  ) {
    return await this._makeRequest({
      url: '/instagram/associate',
      method: 'post',
      data: {
        uuid,
        userId,
        handle,
        blockNumber
      }
    })
  }

  async associateTikTokUser(
    uuid: string,
    userId: number,
    handle: string,
    blockNumber?: number
  ) {
    return await this._makeRequest({
      url: '/tiktok/associate',
      method: 'post',
      data: {
        uuid,
        userId,
        handle,
        blockNumber
      }
    })
  }

  /**
   * Check if an email address has been previously registered.
   */
  async checkIfEmailRegistered(email: string) {
    return await this._makeRequest<{ exists: boolean; isGuest: boolean }>({
      url: '/users/check',
      method: 'get',
      params: {
        email
      }
    })
  }

  /**
   * Get the user's email used for notifications and display.
   */
  async getUserEmail() {
    const headers = await this.getAuthHeaders()

    const res = await this._makeRequest<{ email: string | undefined | null }>({
      url: '/user/email',
      method: 'get',
      headers
    })

    if (!res.email) {
      throw new Error('No email found')
    }
    return res.email
  }

  /**
   * Change the user's email used for notifications and display.
   */
  async changeEmail({ email, otp }: { email: string; otp?: string }) {
    const headers = await this.getAuthHeaders()

    return await this._makeRequest({
      url: '/user/email',
      method: 'PUT',
      headers,
      data: { email, otp }
    })
  }

  async createStripeSession(
    data: CreateStripeSessionRequest
  ): Promise<CreateStripeSessionResponse> {
    const headers = await this.getAuthHeaders()

    return await this._makeRequest({
      url: '/stripe/session',
      method: 'post',
      data,
      headers
    })
  }

  async recordIP() {
    const headers = await this.getAuthHeaders()

    return await this._makeRequest({
      url: '/record_ip',
      method: 'post',
      headers
    })
  }

  async getUserBankTransactionMetadata(transactionId: string) {
    const headers = await this.getAuthHeaders()

    const metadatas = await this._makeRequest<
      Array<{ metadata: InAppAudioPurchaseMetadata }>
    >({
      url: `/transaction_metadata?id=${transactionId}`,
      method: 'get',
      headers
    })
    return metadatas[0]?.metadata ?? null
  }

  async saveUserBankTransactionMetadata(data: {
    transactionSignature: string
    metadata: InAppAudioPurchaseMetadata
  }) {
    const headers = await this.getAuthHeaders()

    return await this._makeRequest({
      url: '/transaction_metadata',
      method: 'post',
      data,
      headers
    })
  }

  async createPlaidLinkToken() {
    const headers = await this.getAuthHeaders()

    return await this._makeRequest<{ linkToken: string }>({
      url: '/create_link_token',
      method: 'get',
      headers
    })
  }

  async createPersonaSessionToken() {
    const headers = await this.getAuthHeaders()

    return await this._makeRequest<{ sessionToken: string }>({
      url: '/create_session_token',
      method: 'get',
      headers
    })
  }
}
