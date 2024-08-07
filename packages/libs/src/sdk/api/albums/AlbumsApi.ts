import { USDC } from '@audius/fixed-decimal'

import type {
  AuthService,
  ClaimableTokensClient,
  PaymentRouterClient,
  SolanaRelayService,
  StorageService
} from '../../services'
import type {
  EntityManagerService,
  AdvancedOptions
} from '../../services/EntityManager/types'
import type { LoggerService } from '../../services/Logger'
import { parseParams } from '../../utils/parseParams'
import { prepareSplits } from '../../utils/preparePaymentSplits'
import {
  ExtendedPaymentSplit,
  instanceOfExtendedPurchaseGate,
  type Configuration
} from '../generated/default'
import { PlaylistsApi } from '../playlists/PlaylistsApi'

import {
  createUpdateAlbumSchema,
  createUploadAlbumSchema,
  DeleteAlbumRequest,
  DeleteAlbumSchema,
  FavoriteAlbumRequest,
  FavoriteAlbumSchema,
  getAlbumRequest,
  getAlbumsRequest,
  getAlbumTracksRequest,
  GetPurchaseAlbumTransactionRequest,
  GetPurchaseAlbumTransactionSchema,
  PurchaseAlbumRequest,
  PurchaseAlbumSchema,
  RepostAlbumRequest,
  RepostAlbumSchema,
  UnfavoriteAlbumRequest,
  UnfavoriteAlbumSchema,
  UnrepostAlbumRequest,
  UnrepostAlbumSchema,
  UpdateAlbumRequest,
  UploadAlbumRequest
} from './types'

export class AlbumsApi {
  private readonly playlistsApi: PlaylistsApi
  constructor(
    configuration: Configuration,
    storage: StorageService,
    entityManager: EntityManagerService,
    private auth: AuthService,
    private logger: LoggerService,
    private claimableTokensClient: ClaimableTokensClient,
    private paymentRouterClient: PaymentRouterClient,
    private solanaRelay: SolanaRelayService
  ) {
    this.playlistsApi = new PlaylistsApi(
      configuration,
      storage,
      entityManager,
      auth,
      logger
    )
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
   * Upload an album
   * Uploads the specified tracks and combines them into an album
   */
  async uploadAlbum(
    params: UploadAlbumRequest,
    advancedOptions?: AdvancedOptions
  ) {
    const { metadata, ...parsedParameters } = await parseParams(
      'uploadAlbum',
      createUploadAlbumSchema()
    )(params)

    const { albumName, ...playlistMetadata } = metadata

    // Call uploadPlaylistInternal with parsed inputs
    const response = await this.playlistsApi.uploadPlaylistInternal(
      {
        ...parsedParameters,
        metadata: {
          ...playlistMetadata,
          playlistName: albumName,
          isAlbum: true
        }
      },
      advancedOptions
    )

    return {
      blockHash: response.blockHash,
      blockNumber: response.blockNumber,
      albumId: response.playlistId
    }
  }

  /** @hidden
   * Update an album
   */
  async updateAlbum(
    params: UpdateAlbumRequest,
    advancedOptions?: AdvancedOptions
  ) {
    const { albumId, metadata, ...parsedParameters } = await parseParams(
      'updateAlbum',
      createUpdateAlbumSchema()
    )(params)

    const { albumName, ...playlistMetadata } = metadata

    // Call updatePlaylistInternal with parsed inputs
    return await this.playlistsApi.updatePlaylistInternal(
      {
        ...parsedParameters,
        playlistId: albumId,
        metadata: {
          ...playlistMetadata,
          playlistName: albumName
        }
      },
      advancedOptions
    )
  }

  /** @hidden
   * Delete an album
   */
  async deleteAlbum(
    params: DeleteAlbumRequest,
    advancedOptions?: AdvancedOptions
  ) {
    await parseParams('deleteAlbum', DeleteAlbumSchema)(params)

    return await this.playlistsApi.deletePlaylist(
      {
        userId: params.userId,
        playlistId: params.albumId
      },
      advancedOptions
    )
  }

  /** @hidden
   * Favorite an album
   */
  async favoriteAlbum(
    params: FavoriteAlbumRequest,
    advancedOptions?: AdvancedOptions
  ) {
    const { metadata } = await parseParams(
      'favoriteAlbum',
      FavoriteAlbumSchema
    )(params)
    return await this.playlistsApi.favoritePlaylist(
      {
        userId: params.userId,
        playlistId: params.albumId,
        metadata
      },
      advancedOptions
    )
  }

  /** @hidden
   * Unfavorite an album
   */
  async unfavoriteAlbum(
    params: UnfavoriteAlbumRequest,
    advancedOptions?: AdvancedOptions
  ) {
    await parseParams('unfavoriteAlbum', UnfavoriteAlbumSchema)(params)
    return await this.playlistsApi.unfavoritePlaylist(
      {
        userId: params.userId,
        playlistId: params.albumId
      },
      advancedOptions
    )
  }

  /** @hidden
   * Repost an album
   */
  async repostAlbum(
    params: RepostAlbumRequest,
    advancedOptions?: AdvancedOptions
  ) {
    const { metadata } = await parseParams(
      'repostAlbum',
      RepostAlbumSchema
    )(params)

    return await this.playlistsApi.repostPlaylist(
      {
        userId: params.userId,
        playlistId: params.albumId,
        metadata
      },
      advancedOptions
    )
  }

  /** @hidden
   * Unrepost an album
   */
  async unrepostAlbum(
    params: UnrepostAlbumRequest,
    advancedOptions?: AdvancedOptions
  ) {
    await parseParams('unrepostAlbum', UnrepostAlbumSchema)(params)
    return await this.playlistsApi.unrepostPlaylist(
      {
        userId: params.userId,
        playlistId: params.albumId
      },
      advancedOptions
    )
  }

  /**
   * Gets the Solana transaction that purchases the album
   *
   * @hidden
   */
  async getPurchaseAlbumTransaction(
    params: GetPurchaseAlbumTransactionRequest
  ) {
    const {
      userId,
      albumId,
      price: priceNumber,
      extraAmount: extraAmountNumber = 0,
      wallet
    } = await parseParams(
      'getPurchaseAlbumTransaction',
      GetPurchaseAlbumTransactionSchema
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
    const locationMemoInstruction =
      await this.solanaRelay.getLocationInstruction()

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
      const transaction = await this.paymentRouterClient.buildTransaction({
        feePayer: wallet,
        instructions: [
          transferInstruction,
          routeInstruction,
          memoInstruction,
          locationMemoInstruction
        ],
        priorityFee: {
          priority: 'HIGH'
        }
      })
      return transaction
    } else {
      // Use the authed wallet's userbank and relay
      const ethWallet = await this.auth.getAddress()
      this.logger.debug(
        `Using userBank ${await this.claimableTokensClient.deriveUserBank({
          ethWallet,
          mint: 'USDC'
        })} to purchase...`
      )
      const paymentRouterTokenAccount =
        await this.paymentRouterClient.getOrCreateProgramTokenAccount({
          mint
        })

      const transferSecpInstruction =
        await this.claimableTokensClient.createTransferSecpInstruction({
          ethWallet,
          destination: paymentRouterTokenAccount.address,
          mint,
          amount: total,
          auth: this.auth
        })
      const transferInstruction =
        await this.claimableTokensClient.createTransferInstruction({
          ethWallet,
          destination: paymentRouterTokenAccount.address,
          mint
        })
      const transaction = await this.paymentRouterClient.buildTransaction({
        instructions: [
          transferSecpInstruction,
          transferInstruction,
          routeInstruction,
          memoInstruction,
          locationMemoInstruction
        ],
        priorityFee: {
          priority: 'HIGH'
        }
      })
      return transaction
    }
  }

  /**
   * Purchases stream access to an album
   *
   * @hidden
   */
  public async purchaseAlbum(params: PurchaseAlbumRequest) {
    await parseParams('purchaseAlbum', PurchaseAlbumSchema)(params)
    const transaction = await this.getPurchaseAlbumTransaction(params)
    if (params.walletAdapter) {
      if (!params.walletAdapter.publicKey) {
        throw new Error(
          'Param walletAdapter was specified, but no wallet selected'
        )
      }
      return await params.walletAdapter.sendTransaction(
        transaction,
        this.paymentRouterClient.connection
      )
    }
    return this.paymentRouterClient.sendTransaction(transaction)
  }
}
