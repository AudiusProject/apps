import { SetAuthFn } from '@audius/hedgehog'
import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios'
import type BN from 'bn.js'
import type Wallet from 'ethereumjs-wallet'
import type { TransactionReceipt } from 'web3-core'

import { AuthHeaders } from '../../constants'
import type { Nullable } from '../../utils'
import { uuid } from '../../utils/uuid'
import type { Web3Manager } from '../web3Manager'

import { getTrackListens, TimeFrame } from './requests'

type Data = Record<string, unknown>
type SetAuthFnParams = Parameters<SetAuthFn>[0]

type RelayTransactionInstruction = {
  programId: string
  data: Buffer
  keys: Array<{
    pubkey: string
    isSigner: boolean
    isWritable: boolean
  }>
}

export type RelayTransaction = {
  resp: {
    txHash: string
    txParams: {
      data: string
      gasLimit: string
      gasPrice: number
      nonce: string
      to: string
      value: string
    }
  }
}

export type RelayTransactionData = {
  instructions: RelayTransactionInstruction[]
  skipPreflight?: boolean
  feePayerOverride?: string | null
  signatures?: Array<{ publicKey: string; signature: Buffer }> | null
  retry?: boolean
  recentBlockhash?: string
  lookupTableAddresses?: string[]
  useCoinflowRelay?: boolean
}

export type IdentityRequestError = AxiosError

type AttestationResult = {
  status: string
  userId: string
  challengeId: string
  amount: number
  source: string
  specifier: string
  error?: string
  phase?: string
  reason?: string
}

type Reaction = {
  reactedTo: string
  reactionValue: number
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

export type IdentityServiceConfig = {
  identityServiceEndpoint: string
}

export class IdentityService {
  identityServiceEndpoint: string
  web3Manager: Web3Manager | null

  constructor({ identityServiceEndpoint }: IdentityServiceConfig) {
    this.identityServiceEndpoint = identityServiceEndpoint
    this.web3Manager = null
  }

  setWeb3Manager(web3Manager: Web3Manager) {
    this.web3Manager = web3Manager
  }

  /* ------- HEDGEHOG AUTH ------- */

  async getFn(params: {
    lookupKey: string
    username: string
    otp?: string
  }): Promise<{ iv: string; cipherText: string }> {
    return await this._makeRequest({
      url: '/authentication',
      method: 'get',
      params
    })
  }

  async setAuthFn(obj: SetAuthFnParams) {
    // get wallet from hedgehog and set as owner wallet
    const ownerWallet = obj.wallet
    this.web3Manager?.setOwnerWallet(ownerWallet)

    // sign headers with new wallet so auth server can derive address
    const headers = await this._signData()

    // delete wallet object so it's not passed to identity
    // @ts-ignore
    delete obj.wallet

    return await this._makeRequest({
      url: '/authentication',
      method: 'post',
      headers,
      data: obj
    })
  }

  async setUserFn(obj: Data & { token?: string }) {
    return await this._makeRequest({
      url: '/user',
      method: 'post',
      data: obj
    })
  }

  async getUserEvents(walletAddress: string) {
    return await this._makeRequest<{ needsRecoveryEmail: boolean }>({
      url: '/userEvents',
      method: 'get',
      params: { walletAddress }
    })
  }

  async sendRecoveryInfo(obj: Record<string, unknown>) {
    return await this._makeRequest<{ status: true }>({
      url: '/recovery',
      method: 'post',
      data: obj
    })
  }

  /**
   * Check if an email address has been previously registered.
   */
  async checkIfEmailRegistered(email: string) {
    return await this._makeRequest<{ exists: boolean }>({
      url: '/users/check',
      method: 'get',
      params: {
        email
      }
    })
  }

  /**
   * Check if the lookupKey exists.
   * WARNING: might not be the auth credentials for the current user!
   * Only use when just a soft check is necessary. Use confirmCredentials.
   */
  async checkAuth({ lookupKey }: { lookupKey: string }) {
    const headers = await this._signData()
    if (headers[AuthHeaders.MESSAGE] && headers[AuthHeaders.SIGNATURE]) {
      return await this._makeRequest({
        url: '/authentication/check',
        method: 'GET',
        headers,
        params: { lookupKey }
      })
    } else {
      throw new Error('Cannot check credentials - user is not authenticated')
    }
  }

  /**
   * Associates a user with a twitter uuid.
   * @param uuid from the Twitter API
   * @param userId
   * @param handle User handle
   */
  async associateTwitterUser(
    uuid: string,
    userId: number,
    handle: string,
    blockNumber: number
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

  /**
   * Associates a user with an instagram uuid.
   * @param uuid from the Instagram API
   * @param userId
   * @param handle
   */
  async associateInstagramUser(
    uuid: string,
    userId: number,
    handle: string,
    blockNumber: number
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

  /**
   * Associates a user with an TikTok uuid.
   * @param uuid from the TikTok API
   * @param userId
   * @param handle
   */
  async associateTikTokUser(
    uuid: string,
    userId: number,
    handle: string,
    blockNumber: number
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
   * Logs a track listen for a given user id.
   * @param trackId
   * @param userId
   * @param listenerAddress if logging this listen on behalf of another IP address, pass through here
   * @param signatureData if logging this listen via a 3p service, a signed piece of data proving authenticity
   */
  async logTrackListen(
    trackId: number,
    userId: number,
    listenerAddress: Nullable<string>,
    signatureData: Nullable<{ signature: string; timestamp: string }>,
    solanaListen = false
  ) {
    const data: {
      userId: number
      solanaListen: boolean
      signature?: string
      timestamp?: string
    } = { userId, solanaListen }
    if (signatureData) {
      data.signature = signatureData.signature
      data.timestamp = signatureData.timestamp
    }
    const request: AxiosRequestConfig = {
      url: `/tracks/${trackId}/listen`,
      method: 'post',
      data
    }

    if (listenerAddress) {
      request.headers = {
        'x-forwarded-for': listenerAddress
      }
    }
    return await this._makeRequest(request)
  }

  /**
   * Return listen history tracks for a given user id.
   * @param userId - User ID
   * @param limit - max # of items to return
   * @param offset - offset into list to return from (for pagination)
   */
  async getListenHistoryTracks(userId: number, limit = 100, offset = 0) {
    const req: AxiosRequestConfig = {
      method: 'get',
      url: '/tracks/history',
      params: { userId, limit, offset }
    }
    return await this._makeRequest(req)
  }

  /**
   * Looks up a Twitter account by handle.
   * @returns twitter API response.
   */
  async lookupTwitterHandle(handle: string) {
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

  /**
   * Gets tracks trending on Audius.
   * @param timeFrame one of day, week, month, or year
   * @param idsArray track ids
   * @param limit
   * @param offset
   */
  async getTrendingTracks(
    timeFrame: string | null = null,
    idsArray: number[] | null = null,
    limit: number | null = null,
    offset: number | null = null
  ) {
    let queryUrl = '/tracks/trending/'

    if (timeFrame != null) {
      switch (timeFrame) {
        case 'day':
        case 'week':
        case 'month':
        case 'year':
          break
        default:
          throw new Error('Invalid timeFrame value provided')
      }
      queryUrl += timeFrame
    }

    const queryParams: { id?: number[]; limit?: number; offset?: number } = {}
    if (idsArray !== null) {
      queryParams.id = idsArray
    }

    if (limit !== null) {
      queryParams.limit = limit
    }

    if (offset !== null) {
      queryParams.offset = offset
    }

    return await this._makeRequest<{
      listenCounts: Array<{ trackId: number; listens: number }>
    }>({
      url: queryUrl,
      method: 'get',
      params: queryParams
    })
  }

  /**
   * Gets listens for tracks bucketted by timeFrame.
   * @param timeFrame one of day, week, month, or year
   * @param idsArray track ids
   * @param startTime parseable by Date.parse
   * @param endTime parseable by Date.parse
   * @param limit
   * @param offset
   */
  async getTrackListens(
    timeFrame: TimeFrame | null = null,
    idsArray: number[] | null = null,
    startTime: string | null = null,
    endTime: string | null = null,
    limit: number | null = null,
    offset: number | null = null
  ): Promise<{
    bucket: Array<{ trackId: number; date: string; listens: number }>
  }> {
    const req = getTrackListens(
      timeFrame,
      idsArray,
      startTime,
      endTime,
      limit,
      offset
    )
    return await this._makeRequest(req)
  }

  async createUserRecord(email: string, walletAddress: string) {
    return await this._makeRequest({
      url: '/user',
      method: 'post',
      data: {
        username: email,
        walletAddress
      }
    })
  }

  async relay(
    contractRegistryKey: string | null | undefined,
    contractAddress: string | null | undefined,
    senderAddress: string,
    encodedABI: string,
    gasLimit: number,
    handle: string | null = null,
    nethermindContractAddress: string | null | undefined,
    nethermindEncodedAbi: string | undefined,
    baseURL?: string
  ): Promise<{ receipt: TransactionReceipt }> {
    return await this._makeRequest({
      baseURL,
      url: '/relay',
      method: 'post',
      data: {
        contractRegistryKey,
        contractAddress,
        senderAddress,
        encodedABI,
        gasLimit,
        handle,
        nethermindContractAddress,
        nethermindEncodedAbi
      }
    })
  }

  async ethRelay(
    contractAddress: string,
    senderAddress: Wallet | string,
    encodedABI: string,
    gasLimit: string
  ): Promise<RelayTransaction> {
    return await this._makeRequest({
      url: '/eth_relay',
      method: 'post',
      data: {
        contractAddress,
        senderAddress,
        encodedABI,
        gasLimit
      }
    })
  }

  async wormholeRelay({
    senderAddress,
    permit,
    transferTokens
  }: {
    senderAddress: string
    permit: {
      contractAddress: string
      encodedABI: string
      gasLimit: number
    }
    transferTokens: {
      contractAddress: string
      encodedABI: string
      gasLimit: number
    }
  }) {
    return await this._makeRequest({
      url: '/wormhole_relay',
      method: 'post',
      data: {
        senderAddress,
        permit,
        transferTokens
      }
    })
  }

  /**
   * Gets the correct wallet that will relay a txn for `senderAddress`
   * @param senderAddress wallet
   */
  async getEthRelayer(senderAddress: string) {
    return await this._makeRequest<{ selectedEthWallet: string }>({
      url: '/eth_relayer',
      method: 'get',
      params: {
        wallet: senderAddress
      }
    })
  }

  async getRandomFeePayer() {
    return await this._makeRequest({
      url: '/solana/random_fee_payer',
      method: 'get',
      headers: {
        'Content-Type': 'application/json'
      }
    })
  }

  // Relays tx data through the solana relay endpoint
  async solanaRelay(transactionData: RelayTransactionData) {
    const headers = await this._signData()

    return await this._makeRequest<{ transactionSignature: string }>({
      url: '/solana/relay',
      method: 'post',
      data: transactionData,
      headers
    })
  }

  async solanaRelayRaw(transactionData: RelayTransactionData) {
    return await this._makeRequest<{ transactionSignature: string }>({
      url: '/solana/relay/raw',
      method: 'post',
      data: transactionData
    })
  }

  async getMinimumDelegationAmount(wallet: string) {
    return await this._makeRequest({
      url: `/protocol/${wallet}/delegation/minimum`,
      method: 'get'
    })
  }

  async updateMinimumDelegationAmount(
    wallet: string,
    minimumDelegationAmount: BN,
    signedData: AxiosRequestConfig['headers']
  ) {
    return await this._makeRequest({
      url: `/protocol/${wallet}/delegation/minimum`,
      method: 'post',
      headers: signedData,
      data: { minimumDelegationAmount }
    })
  }

  /**
   * Sends an attestation result to identity.
   *
   */
  async sendAttestationResult(data: AttestationResult) {
    return await this._makeRequest({
      url: '/rewards/attestation_result',
      method: 'post',
      data
    })
  }

  /**
   * Post a reaction to identity.
   */
  async submitReaction(data: Reaction) {
    const headers = await this._signData()

    return await this._makeRequest({
      url: '/reactions',
      method: 'post',
      data,
      headers
    })
  }

  /**
   * Gets $AUDIO purchase metadata
   */
  async getUserBankTransactionMetadata(transactionId: string) {
    const headers = await this._signData()

    const metadatas = await this._makeRequest<
      Array<{ metadata: InAppAudioPurchaseMetadata }>
    >({
      url: `/transaction_metadata?id=${transactionId}`,
      method: 'get',
      headers
    })
    return metadatas[0]?.metadata ?? null
  }

  /**
   * Saves $AUDIO purchase metadata
   */
  async saveUserBankTransactionMetadata(data: {
    transactionSignature: string
    metadata: InAppAudioPurchaseMetadata
  }) {
    const headers = await this._signData()

    return await this._makeRequest({
      url: '/transaction_metadata',
      method: 'post',
      data,
      headers
    })
  }

  async createStripeSession(
    data: CreateStripeSessionRequest
  ): Promise<CreateStripeSessionResponse> {
    const headers = await this._signData()

    return await this._makeRequest({
      url: '/stripe/session',
      method: 'post',
      data,
      headers
    })
  }

  /* ------- INTERNAL FUNCTIONS ------- */

  async _makeRequest<T = unknown>(axiosRequestObj: AxiosRequestConfig) {
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

  async _signData() {
    if (this.web3Manager) {
      const unixTs = Math.round(new Date().getTime() / 1000) // current unix timestamp (sec)
      const message = `Click sign to authenticate with identity service: ${unixTs}`
      const signature = await this.web3Manager?.sign(
        Buffer.from(message, 'utf-8')
      )
      return {
        [AuthHeaders.MESSAGE]: message,
        [AuthHeaders.SIGNATURE]: signature
      }
    } else {
      return {}
    }
  }
}
