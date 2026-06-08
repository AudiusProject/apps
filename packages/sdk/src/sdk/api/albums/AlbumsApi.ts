import { USDC } from '@audius/fixed-decimal'
import { TransactionInstruction } from '@solana/web3.js'

import type {
  ClaimableTokensClient,
  PaymentRouterClient,
  SolanaRelayService
} from '../../services'
import { Logger, type LoggerService } from '../../services/Logger'
import type { SolanaClient } from '../../services/Solana/programs/SolanaClient'
import { parseParams } from '../../utils/parseParams'
import { prepareSplits } from '../../utils/preparePaymentSplits'
import {
  ExtendedPaymentSplit,
  instanceOfExtendedPurchaseGate,
  type Configuration
} from '../generated/default'
import { PlaylistsApi } from '../playlists/PlaylistsApi'
import type { UploadPlaylistRequest } from '../playlists/types'

import {
  getAlbumRequest,
  getAlbumsRequest,
  getAlbumTracksRequest,
  GetPurchaseAlbumInstructionsRequest,
  GetPurchaseAlbumInstructionsSchema,
  PurchaseAlbumRequest,
  PurchaseAlbumSchema,
  UploadAlbumRequest,
  UploadAlbumSchema,
  CreateAlbumRequestWithFiles,
  UpdateAlbumRequest,
  DeleteAlbumRequest,
  FavoriteAlbumRequest,
  UnfavoriteAlbumRequest,
  RepostAlbumRequest,
  UnrepostAlbumRequest,
  UpdateAlbumSchema,
  type AlbumsApiServicesConfig
} from './types'

export class AlbumsApi {
  private readonly playlistsApi: PlaylistsApi
  private logger: LoggerService
  private claimableTokensClient: ClaimableTokensClient
  private paymentRouterClient: PaymentRouterClient
  private solanaRelay: SolanaRelayService
  private solanaClient: SolanaClient

  constructor(
    configuration: Configuration,
    servicesConfig: AlbumsApiServicesConfig
  ) {
    this.playlistsApi = new PlaylistsApi(configuration, servicesConfig)
    this.logger = (servicesConfig.logger ?? new Logger()).createPrefixedLogger(
      '[albums-api]'
    )
    this.claimableTokensClient = servicesConfig.claimableTokensClient
    this.paymentRouterClient = servicesConfig.paymentRouterClient
    this.solanaRelay = servicesConfig.solanaRelay
    this.solanaClient = servicesConfig.solanaClient
  }

  // READS
  async getAlbum(params: getAlbumRequest) {
    const { userId, albumId } = params
    return await this.playlistsApi.getPlaylist({ userId, playlistId: albumId })
  }

  async getBulkAlbums(params: getAlbumsRequest) {
    const { userId, id } = params
    return await this.playlistsApi.getBulkPlaylists({ userId, id })
  }

  async getAlbumTracks(params: getAlbumTracksRequest) {
    const { albumId } = params
    return await this.playlistsApi.getPlaylistTracks({ playlistId: albumId })
  }

  // WRITES

  /** @hidden
   * Create an album from existing tracks
   */
  async createAlbum(
    params: CreateAlbumRequestWithFiles,
    requestInit?: RequestInit
  ) {
    const { metadata, ...rest } = params
    const { albumName, ...playlistMetadata } = metadata

    // Transform album request to playlist request
    const playlistParams = {
      ...rest,
      metadata: {
        ...playlistMetadata,
        playlistName: albumName,
        isAlbum: true
      }
    }
    const response = await this.playlistsApi.createPlaylist(
      playlistParams,
      requestInit
    )

    return response
  }

  /** @hidden
   * Upload an album
   * Uploads the specified tracks and combines them into an album
   */
  async uploadAlbum(params: UploadAlbumRequest) {
    await parseParams('uploadAlbum', UploadAlbumSchema)(params)

    const { albumName, ...playlistMetadata } = params.metadata

    const playlistParams: UploadPlaylistRequest = {
      ...params,
      metadata: {
        ...playlistMetadata,
        playlistName: albumName,
        isAlbum: true
      }
    }

    const res = await this.playlistsApi.uploadPlaylist(playlistParams)
    return {
      blockHash: 'blockHash' in res ? res.blockHash : undefined,
      blockNumber: 'blockNumber' in res ? res.blockNumber : undefined,
      albumId: res.playlistId
    }
  }

  /** @hidden
   * Update an album
   */
  async updateAlbum(params: UpdateAlbumRequest, requestInit?: RequestInit) {
    await parseParams('updateAlbum', UpdateAlbumSchema)(params)

    const { metadata, albumId, ...rest } = params
    const { albumName, ...playlistMetadata } = metadata

    // Transform album request to playlist request
    const playlistParams = {
      ...rest,
      playlistId: albumId,
      metadata: {
        ...playlistMetadata,
        ...(albumName && { playlistName: albumName })
      }
    }
    return await this.playlistsApi.updatePlaylist(playlistParams, requestInit)
  }

  /** @hidden
   * Delete an album
   */
  async deleteAlbum(params: DeleteAlbumRequest, requestInit?: RequestInit) {
    const playlistParams = {
      userId: params.userId,
      playlistId: params.albumId
    }
    return await this.playlistsApi.deletePlaylist(playlistParams, requestInit)
  }

  /** @hidden
   * Favorite an album
   */
  async favoriteAlbum(params: FavoriteAlbumRequest, requestInit?: RequestInit) {
    const playlistParams = {
      userId: params.userId,
      playlistId: params.albumId,
      metadata: params.metadata
    }
    return await this.playlistsApi.favoritePlaylist(playlistParams, requestInit)
  }

  /** @hidden
   * Unfavorite an album
   */
  async unfavoriteAlbum(
    params: UnfavoriteAlbumRequest,
    requestInit?: RequestInit
  ) {
    const playlistParams = {
      userId: params.userId,
      playlistId: params.albumId
    }
    return await this.playlistsApi.unfavoritePlaylist(
      playlistParams,
      requestInit
    )
  }

  /** @hidden
   * Repost an album
   */
  async repostAlbum(params: RepostAlbumRequest, requestInit?: RequestInit) {
    const playlistParams = {
      userId: params.userId,
      playlistId: params.albumId,
      repostRequestBody: params.metadata
    }
    return await this.playlistsApi.repostPlaylist(playlistParams, requestInit)
  }

  /** @hidden
   * Unrepost an album
   */
  async unrepostAlbum(params: UnrepostAlbumRequest, requestInit?: RequestInit) {
    const playlistParams = {
      userId: params.userId,
      playlistId: params.albumId
    }
    return await this.playlistsApi.unrepostPlaylist(playlistParams, requestInit)
  }

  /**
   * Gets the Solana instructions that purchase the album
   *
   * @hidden
   */
  async getPurchaseAlbumInstructions(
    params: GetPurchaseAlbumInstructionsRequest
  ) {
    const {
      userId,
      albumId,
      price: priceNumber,
      extraAmount: extraAmountNumber = 0
    } = await parseParams(
      'getPurchaseAlbumInstructions',
      GetPurchaseAlbumInstructionsSchema
    )(params)

    const contentType = 'album'
    const mint = 'USDC'

    // Fetch album
    this.logger.debug('Fetching album...', { albumId })
    const { data: album } = await this.playlistsApi.getPlaylistAccessInfo({
      userId: params.userId, // use hashed userId
      playlistId: params.albumId // use hashed albumId
    })

    // Validate purchase attempt
    if (!album) {
      throw new Error('Album not found.')
    }

    if (!album.isStreamGated) {
      throw new Error('Attempted to purchase free album.')
    }

    if (album.userId === params.userId) {
      throw new Error('Attempted to purchase own album.')
    }

    let numberSplits: ExtendedPaymentSplit[] = []
    let centPrice: number
    const accessType: 'stream' | 'download' = 'stream'

    // Get conditions
    if (
      album.streamConditions &&
      instanceOfExtendedPurchaseGate(album.streamConditions)
    ) {
      centPrice = album.streamConditions.usdcPurchase.price
      numberSplits = album.streamConditions.usdcPurchase.splits
    } else {
      this.logger.debug(album.streamConditions)
      throw new Error('Album is not available for purchase.')
    }

    // Check if already purchased
    if (accessType === 'stream' && album.access?.stream) {
      throw new Error('Album already purchased')
    }

    // Check if price changed
    if (USDC(priceNumber).value < USDC(centPrice / 100).value) {
      throw new Error('Track price increased.')
    }

    const extraAmount = USDC(extraAmountNumber).value
    const total = USDC(centPrice / 100.0).value + extraAmount
    this.logger.debug('Purchase total:', total)

    const splits = await prepareSplits({
      splits: numberSplits,
      extraAmount,
      claimableTokensClient: this.claimableTokensClient,
      logger: this.logger
    })
    this.logger.debug('Calculated splits:', splits)

    const routeInstruction =
      await this.paymentRouterClient.createRouteInstruction({
        splits,
        total,
        mint
      })
    const memoInstruction =
      await this.paymentRouterClient.createPurchaseMemoInstruction({
        contentId: albumId,
        contentType,
        blockNumber: album.blocknumber,
        buyerUserId: userId,
        accessType
      })

    let locationMemoInstruction
    try {
      locationMemoInstruction = await this.solanaRelay.getLocationInstruction()
    } catch (e) {
      this.logger.warn('Unable to compute location memo instruction')
    }

    return {
      instructions: {
        routeInstruction,
        memoInstruction,
        locationMemoInstruction
      },
      total
    }
  }

  /**
   * Purchases stream access to an album
   *
   * @hidden
   */
  public async purchaseAlbum(params: PurchaseAlbumRequest) {
    const { wallet } = await parseParams(
      'purchaseAlbum',
      PurchaseAlbumSchema
    )(params)

    const {
      // only send the base params to getPurchaseInstructions
      wallet: ignoredWallet,
      walletAdapter: ignoredWalletAdapter,
      ...baseParams
    } = params
    const {
      instructions: {
        routeInstruction,
        memoInstruction,
        locationMemoInstruction
      },
      total
    } = await this.getPurchaseAlbumInstructions(baseParams)

    let transaction
    const mint = 'USDC'

    if (wallet) {
      this.logger.debug('Using provided wallet to purchase...', {
        wallet: wallet.toBase58()
      })
      // Use the specified Solana wallet
      const transferInstruction =
        await this.paymentRouterClient.createTransferInstruction({
          sourceWallet: wallet,
          total,
          mint
        })
      transaction = await this.solanaClient.buildTransaction({
        feePayer: wallet,
        instructions: [
          transferInstruction,
          routeInstruction,
          memoInstruction,
          locationMemoInstruction
        ].filter(Boolean) as TransactionInstruction[]
      })
    } else {
      // Use the authed wallet's userbank and relay
      this.logger.debug(
        `Using userBank ${await this.claimableTokensClient.deriveUserBank({
          mint: 'USDC'
        })} to purchase...`
      )
      const paymentRouterTokenAccount =
        await this.paymentRouterClient.getOrCreateProgramTokenAccount({
          mint
        })

      const transferSecpInstruction =
        await this.claimableTokensClient.createTransferSecpInstruction({
          destination: paymentRouterTokenAccount.address,
          mint,
          amount: total
        })
      const transferInstruction =
        await this.claimableTokensClient.createTransferInstruction({
          destination: paymentRouterTokenAccount.address,
          mint
        })

      transaction = await this.solanaClient.buildTransaction({
        feePayer: wallet,
        instructions: [
          transferSecpInstruction,
          transferInstruction,
          routeInstruction,
          memoInstruction,
          locationMemoInstruction
        ].filter(Boolean) as TransactionInstruction[]
      })
    }

    if (params.walletAdapter) {
      if (!params.walletAdapter.publicKey) {
        throw new Error(
          'Param walletAdapter was specified, but no wallet selected'
        )
      }
      return await params.walletAdapter.sendTransaction(
        transaction,
        this.solanaClient.connection
      )
    }
    return this.solanaClient.sendTransaction(transaction, {
      skipPreflight: true
    })
  }
}
