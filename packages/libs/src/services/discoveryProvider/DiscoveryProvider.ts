import type { Genre, Middleware, Mood } from '@audius/sdk'
import { FetchError, ResponseError } from '@audius/sdk'
import axios, {
  AxiosError,
  AxiosRequestConfig,
  AxiosResponse,
  Method,
  ResponseType
} from 'axios'
import fetch from 'cross-fetch'
// @ts-ignore
import urlJoin, { PathArg } from 'proper-url-join/es/index.js'
import type { TransactionReceipt } from 'web3-core'

import { CollectionMetadata, Nullable, User, Utils } from '../../utils'
import type { LocalStorage } from '../../utils/localStorage'
import type { EthContracts } from '../ethContracts'
import type { Web3Manager } from '../web3Manager'

import {
  DiscoveryProviderSelection,
  DiscoveryProviderSelectionConfig
} from './DiscoveryProviderSelection'
import { DEFAULT_UNHEALTHY_BLOCK_DIFF, REQUEST_TIMEOUT_MS } from './constants'
import * as Requests from './requests'

const MAX_MAKE_REQUEST_RETRY_COUNT = 5
const MAX_MAKE_REQUEST_RETRIES_WITH_404 = 2

type RequestParams = {
  queryParams: Record<string, string>
  endpoint: string
  timeout?: number
  method?: Method
  urlParams?: PathArg
  headers?: Record<string, string>
  data?: Record<string, unknown>
  responseType?: ResponseType
}

type UserReplicaSet = {
  primarySpID: number
  secondary1SpID: number
  secondary2SpID: number
}

type DiscoveryResponse<Response> = {
  latest_indexed_block: number
  latest_chain_block: number
  latest_indexed_slot_plays: number
  latest_chain_slot_plays: number
  version: { service: string; version: string }
  data: Response
}

export type DiscoveryProviderConfig = {
  whitelist?: Set<string>
  blacklist?: Set<string>
  ethContracts: Nullable<EthContracts>
  web3Manager?: Nullable<Web3Manager>
  endpoint: string
  reselectTimeout?: number
  selectionRequestTimeout?: number
  selectionRequestRetries?: number
  unhealthySlotDiffPlays?: number
  unhealthyBlockDiff?: number
  userId?: number
} & Pick<
  DiscoveryProviderSelectionConfig,
  'selectionCallback' | 'monitoringCallbacks' | 'localStorage'
>

export type UserProfile = {
  userId: string
  email: string
  name: string
  handle: string
  verified: boolean
  profilePicture:
    | { '150x150': string; '480x480': string; '1000x1000': string }
    | null
    | undefined
  sub: number
  iat: string
}

type CurrentUser = User & {
  wallet?: string
  blocknumber?: number
  track_blocknumber?: number
}

type DiscoveryNodeChallenge = {
  challenge_id: string
  user_id: string
  specifier: string
  amount: string
  handle: string
  wallet: string
  completed_blocknumber: number
  created_at: string
  disbursed_amount: number
}

export type DiscoveryRelayBody = {
  contractRegistryKey?: string | null
  contractAddress?: string | null
  senderAddress?: string | null
  encodedABI?: string | null
  gasLimit?: number | null
  handle?: string | null
  nethermindContractAddress?: string | null
  nethermindEncodedAbi?: string | null
}

export class DiscoveryProvider {
  whitelist: Set<string> | undefined
  blacklist: Set<string> | undefined
  ethContracts: Nullable<EthContracts>
  web3Manager?: Nullable<Web3Manager>
  unhealthyBlockDiff: number
  serviceSelector: DiscoveryProviderSelection
  selectionRequestTimeout: number
  selectionRequestRetries: number
  unhealthySlotDiffPlays: number | undefined
  request404Count: number
  maxRequestsForTrue404: number
  monitoringCallbacks:
    | DiscoveryProviderSelection['monitoringCallbacks']
    | undefined

  discoveryProviderEndpoint: string | undefined
  isInitialized = false
  discoveryNodeMiddleware?: Middleware
  selectionCallback?: DiscoveryProviderSelectionConfig['selectionCallback']
  localStorage?: LocalStorage
  userId?: number

  constructor({
    whitelist,
    blacklist,
    ethContracts,
    web3Manager,
    endpoint,
    reselectTimeout,
    selectionCallback,
    monitoringCallbacks,
    selectionRequestTimeout = REQUEST_TIMEOUT_MS,
    selectionRequestRetries = MAX_MAKE_REQUEST_RETRY_COUNT,
    localStorage,
    unhealthySlotDiffPlays,
    unhealthyBlockDiff,
    userId
  }: DiscoveryProviderConfig) {
    this.whitelist = whitelist
    this.blacklist = blacklist
    this.ethContracts = ethContracts
    this.web3Manager = web3Manager
    this.selectionCallback = selectionCallback
    this.localStorage = localStorage
    this.userId = userId
    this.discoveryProviderEndpoint = endpoint

    this.unhealthyBlockDiff = unhealthyBlockDiff ?? DEFAULT_UNHEALTHY_BLOCK_DIFF
    this.serviceSelector = new DiscoveryProviderSelection(
      {
        whitelist: this.whitelist,
        blacklist: this.blacklist,
        reselectTimeout,
        selectionCallback,
        monitoringCallbacks,
        requestTimeout: selectionRequestTimeout,
        unhealthySlotDiffPlays,
        localStorage,
        unhealthyBlockDiff: this.unhealthyBlockDiff
      },
      this.ethContracts
    )
    this.selectionRequestTimeout = selectionRequestTimeout
    this.selectionRequestRetries = selectionRequestRetries
    this.unhealthySlotDiffPlays = unhealthySlotDiffPlays

    this.request404Count = 0
    this.maxRequestsForTrue404 = MAX_MAKE_REQUEST_RETRIES_WITH_404

    this.monitoringCallbacks = monitoringCallbacks
  }

  async init() {}

  setEndpoint(endpoint: string) {
    this.discoveryProviderEndpoint = endpoint
  }

  setCurrentUser(userId?: number) {
    this.userId = userId
  }

  clearCurrentUser() {
    this.userId = undefined
  }

  setUnhealthyBlockDiff(updatedBlockDiff = DEFAULT_UNHEALTHY_BLOCK_DIFF) {
    this.unhealthyBlockDiff = updatedBlockDiff
    this.serviceSelector.setUnhealthyBlockDiff(updatedBlockDiff)
  }

  setUnhealthySlotDiffPlays(updatedDiff: number) {
    this.unhealthySlotDiffPlays = updatedDiff
    this.serviceSelector.setUnhealthySlotDiffPlays(updatedDiff)
  }

  async getUsers(
    limit = 100,
    offset = 0,
    idsArray: Nullable<number[]>,
    walletAddress?: Nullable<string>,
    handle?: Nullable<string>,
    minBlockNumber?: Nullable<number>,
    includeIncomplete?: Nullable<boolean>
  ) {
    const req = Requests.getUsers(
      limit,
      offset,
      idsArray,
      walletAddress,
      handle,
      minBlockNumber,
      includeIncomplete
    )
    return await this._makeRequest<Nullable<User[]>>(req)
  }

  async getTracks(
    limit = 100,
    offset = 0,
    idsArray: Nullable<string[]>,
    targetUserId: Nullable<string>,
    sort: Nullable<boolean>,
    minBlockNumber: Nullable<number>,
    filterDeleted: Nullable<boolean>,
    withUsers?: boolean
  ) {
    const req = Requests.getTracks(
      limit,
      offset,
      idsArray,
      targetUserId,
      sort,
      minBlockNumber,
      filterDeleted,
      withUsers
    )

    return await this._makeRequest(req)
  }

  async getTracksVerbose(
    limit = 100,
    offset = 0,
    idsArray: Nullable<string[]>,
    targetUserId: Nullable<string>,
    sort: Nullable<boolean>,
    minBlockNumber: Nullable<number>,
    filterDeleted: Nullable<boolean>,
    withUsers?: boolean
  ) {
    const req = Requests.getTracks(
      limit,
      offset,
      idsArray,
      targetUserId,
      sort,
      minBlockNumber,
      filterDeleted,
      withUsers
    )

    return await this._makeRequestInternal(req)
  }

  async getTracksByHandleAndSlug(handle: string, slug: string) {
    return await this._makeRequest(
      Requests.getTracksByHandleAndSlug(handle, slug),
      false
    )
  }

  async getTracksIncludingUnlisted(identifiers: string[], withUsers = false) {
    const req = Requests.getTracksIncludingUnlisted(identifiers, withUsers)
    return await this._makeRequest(req)
  }

  async getRandomTracks(
    genre: string,
    limit: number,
    exclusionList: number[],
    time: string
  ) {
    const req = Requests.getRandomTracks(genre, limit, exclusionList, time)
    return await this._makeRequest(req)
  }

  async getStemsForTrack(trackId: number) {
    const req = Requests.getStemsForTrack(trackId)
    return await this._makeRequest(req)
  }

  async getRemixesOfTrack(
    trackId: number,
    limit: Nullable<number>,
    offset: Nullable<number>
  ) {
    const req = Requests.getRemixesOfTrack(trackId, limit, offset)
    return await this._makeRequest(req)
  }

  async getRemixTrackParents(
    trackId: number,
    limit: Nullable<number>,
    offset: Nullable<number>
  ) {
    const req = Requests.getRemixTrackParents(trackId, limit, offset)
    return await this._makeRequest(req)
  }

  async getTrendingTracks(
    genre: Nullable<string>,
    timeFrame: Nullable<string>,
    idsArray: Nullable<number[]>,
    limit: Nullable<number>,
    offset: Nullable<number>,
    withUsers = false
  ) {
    const req = Requests.getTrendingTracks(
      genre,
      timeFrame,
      idsArray,
      limit,
      offset,
      withUsers
    )
    return await this._makeRequest<{
      listenCounts: Array<{ trackId: number; listens: number }>
    }>(req)
  }

  async getPlaylists(
    limit = 100,
    offset = 0,
    idsArray: Nullable<number[]> = null,
    targetUserId: Nullable<number> = null,
    withUsers = false
  ) {
    const req = Requests.getPlaylists(
      limit,
      offset,
      idsArray,
      targetUserId,
      withUsers
    )
    return await this._makeRequest<CollectionMetadata[]>(req)
  }

  async getFullPlaylist(encodedPlaylistId: string, encodedUserId: string) {
    const req = Requests.getFullPlaylist(encodedPlaylistId, encodedUserId)
    return await this._makeRequest(req)
  }

  async getUserRepostFeed(
    userId: number,
    limit = 100,
    offset = 0,
    withUsers = false
  ) {
    const req = Requests.getUserRepostFeed(userId, limit, offset, withUsers)
    return await this._makeRequest(req)
  }

  async getFollowIntersectionUsers(
    limit = 100,
    offset = 0,
    followeeUserId: number,
    followerUserId: number
  ) {
    const req = Requests.getFollowIntersectionUsers(
      limit,
      offset,
      followeeUserId,
      followerUserId
    )
    return await this._makeRequest(req)
  }

  async getTrackRepostIntersectionUsers(
    limit = 100,
    offset = 0,
    repostTrackId: number,
    followerUserId: number
  ) {
    const req = Requests.getTrackRepostIntersectionUsers(
      limit,
      offset,
      repostTrackId,
      followerUserId
    )
    return await this._makeRequest(req)
  }

  async getPlaylistRepostIntersectionUsers(
    limit = 100,
    offset = 0,
    repostPlaylistId: number,
    followerUserId: number
  ) {
    const req = Requests.getPlaylistRepostIntersectionUsers(
      limit,
      offset,
      repostPlaylistId,
      followerUserId
    )
    return await this._makeRequest(req)
  }

  async getFollowersForUser(limit = 100, offset = 0, followeeUserId: string) {
    const req = Requests.getFollowersForUser(limit, offset, followeeUserId)
    return await this._makeRequest(req)
  }

  async getFolloweesForUser(limit = 100, offset = 0, followerUserId: string) {
    const req = Requests.getFolloweesForUser(limit, offset, followerUserId)
    return await this._makeRequest(req)
  }

  async getRepostersForTrack(limit = 100, offset = 0, repostTrackId: number) {
    const req = Requests.getRepostersForTrack(limit, offset, repostTrackId)
    return await this._makeRequest(req)
  }

  async getRepostersForPlaylist(
    limit = 100,
    offset = 0,
    repostPlaylistId: number
  ) {
    const req = Requests.getRepostersForPlaylist(
      limit,
      offset,
      repostPlaylistId
    )
    return await this._makeRequest(req)
  }

  async getSaversForTrack(limit = 100, offset = 0, saveTrackId: number) {
    const req = Requests.getSaversForTrack(limit, offset, saveTrackId)
    return await this._makeRequest(req)
  }

  async getSaversForPlaylist(limit = 100, offset = 0, savePlaylistId: number) {
    const req = Requests.getSaversForPlaylist(limit, offset, savePlaylistId)
    return await this._makeRequest(req)
  }

  async verifyToken(token: string): Promise<UserProfile | false> {
    const req = Requests.verifyToken(token)
    const res = await this._makeRequest<UserProfile | null>(req)
    if (res == null) {
      return false
    } else {
      return res
    }
  }

  async searchFull(text: string, kind: string, limit = 100, offset = 0) {
    const req = Requests.searchFull(text, kind, limit, offset)
    return await this._makeRequest(req)
  }

  async searchAutocomplete(text: string, limit = 100, offset = 0) {
    const req = Requests.searchAutocomplete(text, limit, offset)
    return await this._makeRequest(req)
  }

  async searchTags(
    text: string,
    userTagCount = 2,
    kind = 'all',
    limit = 100,
    offset = 0,
    genre?: Genre,
    mood?: Mood,
    bpmMin?: string,
    bpmMax?: string,
    key?: string,
    isVerified?: boolean,
    hasDownloads?: boolean,
    isPremium?: boolean,
    sortMethod?: 'recent' | 'relevant' | 'popular'
  ) {
    const req = Requests.searchTags(
      text,
      userTagCount,
      kind,
      limit,
      offset,
      genre,
      mood,
      bpmMin,
      bpmMax,
      key,
      isVerified,
      hasDownloads,
      isPremium,
      sortMethod
    )
    return await this._makeRequest(req)
  }

  async getLibraryPlaylists(limit = 100, offset = 0, withUsers = false) {
    const req = Requests.getLibraryPlaylists(limit, offset, withUsers)
    return await this._makeRequest(req)
  }

  async getLibraryAlbums(limit = 100, offset = 0, withUsers = false) {
    const req = Requests.getLibraryAlbums(limit, offset, withUsers)
    return await this._makeRequest(req)
  }

  async getLibraryTracks(limit = 100, offset = 0, withUsers = false) {
    const req = Requests.getLibraryTracks(limit, offset, withUsers)
    return await this._makeRequest(req)
  }

  async getUserAccount(wallet: string) {
    const req = Requests.getUserAccount(wallet)
    return await this._makeRequest<CurrentUser>(req)
  }

  /**
   * @deprecated Migrate to using getTrendingPlaylists
   */
  async getTopPlaylists(
    type: 'playlist' | 'album',
    limit: number,
    mood: string,
    filter: string,
    withUsers = false
  ) {
    const req = Requests.getTopPlaylists(type, limit, mood, filter, withUsers)
    return await this._makeRequest(req)
  }

  async getTopFullPlaylists({
    type,
    limit,
    mood,
    filter,
    encodedUserId,
    withUsers = false
  }: Requests.GetTopFullPlaylistsParams) {
    const req = Requests.getTopFullPlaylists({
      type,
      limit,
      mood,
      filter,
      encodedUserId,
      withUsers
    })
    return await this._makeRequest(req)
  }

  /**
   * @deprecated Migrate to using getBestNewReleases
   */
  async getTopFolloweeWindowed(
    type: string,
    window: string,
    limit: string,
    withUsers = false
  ) {
    const req = Requests.getTopFolloweeWindowed(type, window, limit, withUsers)
    return await this._makeRequest(req)
  }

  async getBestNewReleases(
    encodedUserId: string,
    window: string,
    limit: string,
    withUsers = false
  ) {
    const req = Requests.getBestNewReleases(
      window,
      limit,
      encodedUserId,
      withUsers
    )
    return await this._makeRequest(req)
  }

  /**
   * @deprecated Migrate to using getMostLovedTracks
   */
  async getTopFolloweeSaves(type: string, limit: string, withUsers = false) {
    const req = Requests.getTopFolloweeSaves(type, limit, withUsers)
    return await this._makeRequest(req)
  }

  async getMostLovedTracks(
    encodedUserId: string,
    limit: string,
    withUsers = false
  ) {
    const req = Requests.getMostLovedTracks(encodedUserId, limit, withUsers)
    return await this._makeRequest(req)
  }

  async getFeelingLuckyTracks(
    encodedUserId: string,
    limit: string,
    withUsers = false
  ) {
    const req = Requests.getFeelingLuckyTracks(encodedUserId, limit, withUsers)
    return await this._makeRequest(req)
  }

  async getLatest(type: string, limit = 1, offset = 0) {
    const req = Requests.getLatest(type, limit, offset)
    return await this._makeRequest(req)
  }

  async getTopCreatorsByGenres(
    genres: string[],
    limit = 30,
    offset = 0,
    withUsers = false
  ) {
    const req = Requests.getTopCreatorsByGenres(
      genres,
      limit,
      offset,
      withUsers
    )
    return await this._makeRequest(req)
  }

  async getUserNotifications(params: Requests.GetUserNotificationsParams) {
    const req = Requests.getUserNotifications(params)
    return await this._makeRequest(req)
  }

  async getURSMContentNodes(ownerWallet: string | null = null) {
    const req = Requests.getURSMContentNodes(ownerWallet)
    return await this._makeRequest(req)
  }

  async getNotifications(
    minBlockNumber: string,
    trackIds: string[],
    timeout: number
  ) {
    const req = Requests.getNotifications(minBlockNumber, trackIds, timeout)
    return await this._makeRequest(req)
  }

  async getUserSubscribers(encodedUserId: string, timeout: number) {
    const req = Requests.getUserSubscribers(encodedUserId, timeout)
    return await this._makeRequest(req)
  }

  async bulkGetUserSubscribers(encodedUserIds: string, timeout: number) {
    const req = Requests.bulkGetUserSubscribers(encodedUserIds, timeout)
    return await this._makeRequest(req)
  }

  async getCIDData(cid: string, responseType: ResponseType, timeout: number) {
    const req = Requests.getCIDData(cid, responseType, timeout)
    return await this._makeRequest(req)
  }

  async getSolanaNotifications(minSlotNumber: number, timeout: number) {
    const req = Requests.getSolanaNotifications(minSlotNumber, timeout)
    return await this._makeRequest(req)
  }

  async getTrackListenMilestones(timeout: number) {
    const req = Requests.getTrackListenMilestones(timeout)
    return await this._makeRequest(req)
  }

  async getChallengeAttestation(
    challengeId: string,
    encodedUserId: string,
    specifier: string,
    oracleAddress: string,
    discoveryProviderEndpoint: string
  ) {
    const req = Requests.getChallengeAttestation(
      challengeId,
      encodedUserId,
      specifier,
      oracleAddress
    )
    const { data } = await this._performRequestWithMonitoring<{
      data: { owner_wallet: string; attestation: string }
    }>(req, discoveryProviderEndpoint)
    return data
  }

  async getCreateSenderAttestation(
    senderEthAddress: string,
    discoveryProviderEndpoint: string
  ) {
    const req = Requests.getCreateSenderAttestation(senderEthAddress)
    const { data } = await this._performRequestWithMonitoring<{
      data: { owner_wallet: string; attestation: string }
    }>(req, discoveryProviderEndpoint)
    return data
  }

  async getUndisbursedChallenges(
    limit: number | null = null,
    offset: number | null = null,
    completedBlockNumber: string | null = null,
    encodedUserId: number | null = null
  ) {
    const req = Requests.getUndisbursedChallenges(
      limit,
      offset,
      completedBlockNumber,
      encodedUserId
    )
    const res = await this._makeRequest<DiscoveryNodeChallenge[]>(req)
    if (!res) return []
    return res.map((r) => ({ ...r, amount: parseInt(r.amount) }))
  }

  async getUserListenCountsMonthly(
    encodedUserId: string,
    startTime: string,
    endTime: string
  ): Promise<Object | null | undefined> {
    const req = Requests.getUserListenCountsMonthly(
      encodedUserId,
      startTime,
      endTime
    )

    return await this._makeRequest<Object | null>(req)
  }

  async getUserReplicaSet({
    encodedUserId,
    blockNumber
  }: {
    encodedUserId: string
    blockNumber?: number
  }) {
    const req = Requests.getUserReplicaSet(encodedUserId)

    return await this._makeRequest<Nullable<UserReplicaSet>>(
      req,
      true,
      0,
      false,
      blockNumber
    )
  }

  async relay(
    body: DiscoveryRelayBody
  ): Promise<{ receipt: TransactionReceipt } | undefined> {
    const requestObj: Record<string, unknown> = {
      endpoint: '/relay',
      method: 'post',
      headers: {
        'Content-Type': 'application/json'
      },
      data: body
    }
    if (!this.discoveryProviderEndpoint || !this.discoveryNodeMiddleware) return

    const axiosRequest = this._createDiscProvRequest(
      requestObj as RequestParams,
      this.discoveryProviderEndpoint
    )

    const { data, url = '', ...restRequest } = axiosRequest

    const fetchRequestInit: RequestInit = {
      body: data ? JSON.stringify(data) : data,
      ...restRequest
    }
    let fetchParams = { url, init: fetchRequestInit }

    fetchParams =
      (await this.discoveryNodeMiddleware.pre?.({ fetch, ...fetchParams })) ??
      fetchParams
    let response: globalThis.Response | undefined

    try {
      response = await fetch(fetchParams.url, fetchParams.init)
    } catch (error) {
      response =
        (await this.discoveryNodeMiddleware.onError?.({
          fetch,
          ...fetchParams,
          error,
          response: response ? response.clone() : undefined
        })) ?? response

      if (response === undefined) {
        if (error instanceof Error) {
          throw new FetchError(
            error,
            'The request failed and the interceptors did not return an alternative response'
          )
        } else {
          throw error
        }
      }
    }

    response =
      (await this.discoveryNodeMiddleware.post?.({
        fetch,
        ...fetchParams,
        response
      })) ?? response

    if (!response || response.status < 200 || response.status >= 300) {
      throw new ResponseError(
        response,
        'Response did not contain a successful status code'
      )
    }

    return await response.json()
  }

  async getUnclaimedId(
    type: Parameters<typeof Requests.getUnclaimedId>[0]
  ): Promise<null | undefined | string> {
    const req = Requests.getUnclaimedId(type)
    return await this._makeRequest(req)
  }

  async _performRequestWithMonitoring<Response>(
    requestObj: RequestParams,
    discoveryProviderEndpoint: string
  ) {
    const axiosRequest = this._createDiscProvRequest(
      requestObj,
      discoveryProviderEndpoint
    )
    let response: AxiosResponse<{
      signer: string
      signature: string
    }>
    let parsedResponse: Response

    const url = new URL(axiosRequest.url ?? '')
    const start = Date.now()
    try {
      response = await axios(axiosRequest)
      const duration = Date.now() - start
      parsedResponse = Utils.parseDataFromResponse(response)

      if (this.monitoringCallbacks && 'request' in this.monitoringCallbacks) {
        try {
          this.monitoringCallbacks.request?.({
            endpoint: url.origin,
            pathname: url.pathname,
            queryString: url.search,
            signer: response.data.signer,
            signature: response.data.signature,
            requestMethod: axiosRequest.method,
            status: response.status,
            responseTimeMillis: duration
          })
        } catch (e) {
          console.error(e)
        }
      }
    } catch (e) {
      const error = e as AxiosError
      const resp = error.response
      const duration = Date.now() - start
      const errData = error.response?.data ?? error

      if (this.monitoringCallbacks && 'request' in this.monitoringCallbacks) {
        try {
          this.monitoringCallbacks.request?.({
            endpoint: url.origin,
            pathname: url.pathname,
            queryString: url.search,
            requestMethod: axiosRequest.method,
            status: resp?.status,
            responseTimeMillis: duration
          })
        } catch (e) {
          console.error(e)
        }
      }
      if (resp && resp.status === 404) {
        // eslint-disable-next-line no-throw-literal
        throw { ...errData, status: '404' }
      }

      throw errData
    }
    return parsedResponse
  }

  async _getBlocksBehind(parsedResponse: {
    latest_indexed_block: number
    latest_chain_block: number
  }) {
    try {
      const {
        latest_indexed_block: indexedBlock,
        latest_chain_block: chainBlock
      } = parsedResponse

      const blockDiff = chainBlock - indexedBlock
      if (blockDiff > this.unhealthyBlockDiff) {
        return blockDiff
      }
      return null
    } catch (e) {
      console.error(e)
      return this.unhealthyBlockDiff
    }
  }

  async _getPlaysSlotsBehind(parsedResponse: {
    latest_indexed_slot_plays: number
    latest_chain_slot_plays: number
  }) {
    if (!this.unhealthySlotDiffPlays) return null

    try {
      const {
        latest_indexed_slot_plays: indexedSlotPlays,
        latest_chain_slot_plays: chainSlotPlays
      } = parsedResponse

      const slotDiff = chainSlotPlays - indexedSlotPlays
      if (slotDiff > this.unhealthySlotDiffPlays) {
        return slotDiff
      }
      return null
    } catch (e) {
      console.error(e)
      return this.unhealthySlotDiffPlays
    }
  }

  async _makeRequest<Response>(
    requestObj: Record<string, unknown>,
    retry = true,
    attemptedRetries = 0,
    throwError = false,
    blockNumber?: number
  ): Promise<Response | undefined | null> {
    return (
      await this._makeRequestInternal<Response>(
        requestObj,
        retry,
        attemptedRetries,
        throwError,
        blockNumber
      )
    )?.data
  }

  async _makeRequestInternal<Response>(
    requestObj: Record<string, unknown>,
    _retry = true,
    _attemptedRetries = 0,
    throwError = false,
    blockNumber?: number
  ) {
    return await this._makeRequestInternalNext<Response>(
      requestObj,
      throwError,
      blockNumber
    )
  }

  async _makeRequestInternalLegacy<Response>(
    requestObj: Record<string, unknown>,
    retry = true,
    attemptedRetries = 0,
    throwError = false,
    blockNumber?: number
  ): Promise<
    | {
        latest_indexed_block: number
        latest_chain_block: number
        latest_indexed_slot_plays: number
        latest_chain_slot_plays: number
        data: Response
      }
    | undefined
    | null
  > {
    const returnOrThrow = <ErrorType>(e: ErrorType) => {
      if (throwError) {
        // eslint-disable-next-line @typescript-eslint/no-throw-literal
        throw e
      }
      return null
    }

    try {
      const newDiscProvEndpoint =
        await this.getHealthyDiscoveryProviderEndpoint(attemptedRetries)

      if (this.discoveryProviderEndpoint !== newDiscProvEndpoint) {
        let updateDiscProvEndpointMsg = `Current Discovery Provider endpoint ${this.discoveryProviderEndpoint} is unhealthy. `
        updateDiscProvEndpointMsg += `Switching over to the new Discovery Provider endpoint ${newDiscProvEndpoint}!`
        console.info(updateDiscProvEndpointMsg)
        this.discoveryProviderEndpoint = newDiscProvEndpoint
        attemptedRetries = 0
      }
    } catch (e) {
      console.error(e)
      return
    }
    let parsedResponse: {
      latest_indexed_block: number
      latest_chain_block: number
      latest_indexed_slot_plays: number
      latest_chain_slot_plays: number
      data: Response
    }
    try {
      parsedResponse = await this._performRequestWithMonitoring(
        requestObj as RequestParams,
        this.discoveryProviderEndpoint
      )
    } catch (e) {
      const error = e as { message: string; status: string }
      const failureStr = 'Failed to make Discovery Provider request, '
      const attemptStr = `attempt #${attemptedRetries}, `
      const errorStr = `error ${JSON.stringify(error.message)}, `
      const requestStr = `request: ${JSON.stringify(requestObj)}`
      const fullErrString = `${failureStr}${attemptStr}${errorStr}${requestStr}`

      console.warn(fullErrString)

      if (retry) {
        if (error.status === '404') {
          this.request404Count += 1
          if (this.request404Count < this.maxRequestsForTrue404) {
            return await this._makeRequestInternalLegacy(
              requestObj,
              retry,
              this.selectionRequestRetries + 1,
              throwError
            )
          } else {
            this.request404Count = 0
            return returnOrThrow(e)
          }
        }

        return await this._makeRequestInternalLegacy(
          requestObj,
          retry,
          attemptedRetries + 1,
          throwError
        )
      }

      return returnOrThrow(e)
    }

    const notInRegressedMode =
      this.ethContracts && !this.ethContracts.isInRegressedMode()

    const blockDiff = await this._getBlocksBehind(parsedResponse)
    if (blockNumber && parsedResponse.latest_indexed_block < blockNumber) {
      throw new Error(
        `Requested blocknumber ${blockNumber}, but discovery is behind at ${parsedResponse.latest_indexed_block}`
      )
    }
    if (notInRegressedMode && blockDiff) {
      const errorMessage = `${this.discoveryProviderEndpoint} is too far behind [block diff: ${blockDiff}]`
      if (retry) {
        console.info(
          `${errorMessage}. Retrying request at attempt #${attemptedRetries}...`
        )
        return await this._makeRequestInternalLegacy(
          requestObj,
          retry,
          attemptedRetries + 1,
          throwError
        )
      }
      return returnOrThrow(new Error(errorMessage))
    }

    const playsSlotDiff = await this._getPlaysSlotsBehind(parsedResponse)
    if (notInRegressedMode && playsSlotDiff) {
      const errorMessage = `${this.discoveryProviderEndpoint} is too far behind [slot diff: ${playsSlotDiff}]`
      if (retry) {
        console.info(
          `${errorMessage}. Retrying request at attempt #${attemptedRetries}...`
        )
        return await this._makeRequestInternalLegacy(
          requestObj,
          retry,
          attemptedRetries + 1,
          throwError
        )
      }
      return returnOrThrow(new Error(errorMessage))
    }

    this.request404Count = 0

    return parsedResponse
  }

  async _makeRequestInternalNext<Response>(
    requestObj: Record<string, unknown>,
    throwError = false,
    blockNumber?: number
  ) {
    if (!this.discoveryProviderEndpoint || !this.discoveryNodeMiddleware) return

    const axiosRequest = this._createDiscProvRequest(
      requestObj as RequestParams,
      this.discoveryProviderEndpoint
    )

    const { data, url = '', ...restRequest } = axiosRequest

    const fetchRequestInit: RequestInit = {
      body: data ? JSON.stringify(data) : data,
      ...restRequest
    }
    let fetchParams = { url, init: fetchRequestInit }

    fetchParams =
      (await this.discoveryNodeMiddleware.pre?.({ fetch, ...fetchParams })) ??
      fetchParams
    let response: globalThis.Response | undefined

    try {
      response = await fetch(fetchParams.url, fetchParams.init)
    } catch (error) {
      response =
        (await this.discoveryNodeMiddleware.onError?.({
          fetch,
          ...fetchParams,
          error,
          response: response ? response.clone() : undefined
        })) ?? response

      if (response === undefined) {
        if (throwError) {
          if (error instanceof Error) {
            throw new FetchError(
              error,
              'The request failed and the interceptors did not return an alternative response'
            )
          } else {
            throw error
          }
        }
        return null
      }
    }

    response =
      (await this.discoveryNodeMiddleware.post?.({
        fetch,
        ...fetchParams,
        response
      })) ?? response

    const responseBody: DiscoveryResponse<Response> = await response.json()

    if (blockNumber && responseBody.latest_indexed_block < blockNumber) {
      throw new Error(
        `Requested blocknumber ${blockNumber}, but discovery is behind at ${responseBody.latest_indexed_block}`
      )
    }

    return responseBody
  }

  async getHealthyDiscoveryProviderEndpoint(attemptedRetries: number) {
    let endpoint = this.discoveryProviderEndpoint as string
    if (attemptedRetries > this.selectionRequestRetries || !endpoint) {
      console.info(`Attempted max retries with endpoint ${endpoint}`)
      this.serviceSelector.addUnhealthy(endpoint)

      this.serviceSelector.clearCached()
      endpoint = await this.serviceSelector.select()
    }

    if (!endpoint) {
      throw new Error('All Discovery Providers are unhealthy and unavailable.')
    }

    return endpoint
  }

  _createDiscProvRequest(
    requestObj: RequestParams,
    discoveryProviderEndpoint: string
  ) {
    if (requestObj.queryParams) {
      Object.entries(requestObj.queryParams).forEach(([k, v]) => {
        if (v === undefined || v === null) {
          // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
          delete requestObj.queryParams[k]
        }
      })
    }

    const requestUrl = urlJoin(
      discoveryProviderEndpoint,
      requestObj.endpoint,
      requestObj.urlParams,
      { query: requestObj.queryParams }
    )

    let headers: Record<string, string> = {}
    if (requestObj.headers) {
      headers = requestObj.headers
    }
    if (this.userId) {
      headers['X-User-ID'] = `${this.userId}`
    }

    headers['x-trpc-hint'] = '0'

    const timeout = requestObj.timeout ?? this.selectionRequestTimeout
    let axiosRequest: AxiosRequestConfig = {
      url: requestUrl,
      headers,
      method: requestObj.method ?? 'get',
      responseType: requestObj.responseType ?? 'json',
      timeout
    }

    if (requestObj.method === 'post' && requestObj.data) {
      axiosRequest = {
        ...axiosRequest,
        data: requestObj.data
      }
    }
    return axiosRequest
  }
}
