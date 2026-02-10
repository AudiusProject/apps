import { USDC } from '@audius/fixed-decimal'
import { TransactionInstruction } from '@solana/web3.js'
import snakecaseKeys from 'snakecase-keys'

import type {
  EntityManagerService,
  ClaimableTokensClient,
  PaymentRouterClient,
  SolanaRelayService
} from '../../services'
import {
  Action,
  EntityType,
  AdvancedOptions
} from '../../services/EntityManager/types'
import type { LoggerService } from '../../services/Logger'
import type { SolanaClient } from '../../services/Solana/programs/SolanaClient'
import type { StorageService, UploadHandle } from '../../services/Storage'
import { decodeHashId, encodeHashId } from '../../utils/hashId'
import { getLocation } from '../../utils/location'
import { parseParams } from '../../utils/parseParams'
import { prepareSplits } from '../../utils/preparePaymentSplits'
import { retry3 } from '../../utils/retry'
import {
  Configuration,
  StreamTrackRequest,
  DownloadTrackRequest,
  TracksApi as GeneratedTracksApi,
  ExtendedPaymentSplit,
  instanceOfExtendedPurchaseGate
} from '../generated/default'
import { RequiredError } from '../generated/default/runtime'

import { TrackUploadHelper } from './TrackUploadHelper'
import {
  DeleteTrackRequest,
  DeleteTrackSchema,
  RepostTrackRequest,
  RepostTrackSchema,
  FavoriteTrackRequest,
  FavoriteTrackSchema,
  UnrepostTrackRequest,
  UnrepostTrackSchema,
  UnfavoriteTrackRequest,
  UnfavoriteTrackSchema,
  UpdateTrackRequest,
  UploadTrackRequest,
  PurchaseTrackRequest,
  PurchaseTrackSchema,
  GetPurchaseTrackInstructionsRequest,
  GetPurchaseTrackInstructionsSchema,
  RecordTrackDownloadRequest,
  RecordTrackDownloadSchema,
  UploadTrackFilesRequest,
  UploadTrackSchema,
  UpdateTrackSchema,
  UploadTrackFilesSchema,
  ShareTrackSchema,
  ShareTrackRequest,
  type PublishTrackRequest,
  PublishTrackSchema,
  type PublishStemRequest,
  PublishStemSchema,
  type UploadTrackFilesTask
} from './types'

// Extend that new class
export class TracksApi extends GeneratedTracksApi {
  private readonly trackUploadHelper: TrackUploadHelper

  constructor(
    configuration: Configuration,
    private readonly storage: StorageService,
    private readonly entityManager: EntityManagerService,
    private readonly logger: LoggerService,
    private readonly claimableTokensClient: ClaimableTokensClient,
    private readonly paymentRouterClient: PaymentRouterClient,
    private readonly solanaRelay: SolanaRelayService,
    private readonly solanaClient: SolanaClient
  ) {
    super(configuration)
    this.trackUploadHelper = new TrackUploadHelper(configuration)
    this.logger = logger.createPrefixedLogger('[tracks-api]')
  }

  /**
   * Get the url of the track's streamable mp3 file
   */
  async getTrackStreamUrl(params: StreamTrackRequest): Promise<string> {
    if (params.trackId === null || params.trackId === undefined) {
      throw new RequiredError(
        'trackId',
        'Required parameter params.trackId was null or undefined when calling getTrack.'
      )
    }

    const queryParams = new URLSearchParams()
    if (params.userId) queryParams.append('user_id', params.userId)
    if (params.preview !== undefined)
      queryParams.append('preview', String(params.preview))
    if (params.userSignature)
      queryParams.append('user_signature', params.userSignature)
    if (params.userData) queryParams.append('user_data', params.userData)
    if (params.nftAccessSignature)
      queryParams.append('nft_access_signature', params.nftAccessSignature)
    if (params.skipPlayCount !== undefined)
      queryParams.append('skip_play_count', String(params.skipPlayCount))
    if (params.apiKey) queryParams.append('api_key', params.apiKey)
    if (params.skipCheck !== undefined)
      queryParams.append('skip_check', String(params.skipCheck))
    if (params.noRedirect !== undefined)
      queryParams.append('no_redirect', String(params.noRedirect))

    const path = `/tracks/{track_id}/stream`.replace(
      `{${'track_id'}}`,
      encodeURIComponent(String(params.trackId))
    )
    const queryString = queryParams.toString()
    return `${this.configuration.basePath}${path}${
      queryString ? '?' + queryString : ''
    }`
  }

  /**
   * Get the url of the track's downloadable file
   */
  async getTrackDownloadUrl(params: DownloadTrackRequest): Promise<string> {
    if (params.trackId === null || params.trackId === undefined) {
      throw new RequiredError(
        'trackId',
        'Required parameter params.trackId was null or undefined when calling getTrack.'
      )
    }

    const queryParams = new URLSearchParams()
    if (params.userId) queryParams.append('user_id', params.userId)
    if (params.userSignature)
      queryParams.append('user_signature', params.userSignature)
    if (params.userData) queryParams.append('user_data', params.userData)
    if (params.nftAccessSignature)
      queryParams.append('nft_access_signature', params.nftAccessSignature)
    if (params.filename) queryParams.append('filename', params.filename)

    const path = `/tracks/{track_id}/download`.replace(
      `{${'track_id'}}`,
      encodeURIComponent(String(params.trackId))
    )
    const queryString = queryParams.toString()
    return `${this.configuration.basePath}${path}${
      queryString ? '?' + queryString : ''
    }`
  }

  /** @hidden
   * Upload track files, does not write to chain
   */
  uploadTrackFiles(params: UploadTrackFilesRequest): UploadTrackFilesTask {
    let audioUpload: UploadHandle | null = null
    let imageUpload: UploadHandle | null = null
    let totalProgressPercentage = 0
    return {
      start: async () => {
        const { audioFile, imageFile, fileMetadata, onProgress } =
          await parseParams('uploadTrackFiles', UploadTrackFilesSchema)(params)

        imageUpload = imageFile
          ? this.storage.uploadFile({
              file: imageFile,
              onProgress: (progress) =>
                onProgress?.(totalProgressPercentage, {
                  key: 'image',
                  ...progress
                }),
              metadata: {
                template: 'img_square',
                filename: imageFile.name ?? undefined,
                filetype: imageFile.type ?? undefined
              }
            })
          : null

        audioUpload = audioFile
          ? this.storage.uploadFile({
              file: audioFile,
              onProgress: (progress) => {
                // Only audio affects the total progress
                totalProgressPercentage =
                  (progress.loaded / progress.total) * 0.5 +
                  progress.transcode * 0.5
                onProgress?.(totalProgressPercentage, {
                  key: 'audio',
                  ...progress
                })
              },
              metadata: {
                template: 'audio',
                filename: audioFile.name ?? undefined,
                filetype: audioFile.type ?? undefined,
                placementHosts: fileMetadata?.placementHosts,
                previewStartSeconds: fileMetadata?.previewStartSeconds
              }
            })
          : null
        const [audioUploadResponse, imageUploadResponse] = await Promise.all([
          audioUpload?.start(),
          imageUpload?.start()
        ])
        this.logger.info('Successfully uploaded track files')
        return { audioUploadResponse, imageUploadResponse }
      },
      abort: (shouldTerminate?: boolean) => {
        audioUpload?.abort(shouldTerminate)
        imageUpload?.abort(shouldTerminate)
      }
    }
  }

  /** @hidden
   * Publishes a track that was uploaded using storage node uploadFileV2 uploads.
   */
  async publishTrack(
    params: PublishTrackRequest,
    advancedOptions?: AdvancedOptions
  ) {
    const {
      userId,
      metadata: parsedMetadata,
      audioUploadResponse,
      imageUploadResponse
    } = await parseParams('publishTrack', PublishTrackSchema)(params)

    const metadata = this.trackUploadHelper.transformTrackUploadMetadata(
      parsedMetadata,
      userId
    )

    const populatedMetadata =
      this.trackUploadHelper.populateTrackMetadataWithUploadResponse(
        metadata,
        audioUploadResponse,
        imageUploadResponse
      )

    return this.writeTrackToChain(
      params.userId,
      populatedMetadata,
      advancedOptions
    )
  }

  /** @hidden
   * Publishes a stem that was uploaded using storage node uploadFileV2 uploads.
   */
  async publishStem(
    params: PublishStemRequest,
    advancedOptions?: AdvancedOptions
  ) {
    const {
      userId,
      metadata: parsedMetadata,
      audioUploadResponse
    } = await parseParams('publishStem', PublishStemSchema)(params)

    const trackMetadata = {
      title: audioUploadResponse.orig_filename || 'Untitled Stem',
      isStreamGated: false,
      streamConditions: undefined,
      isUnlisted: false,
      fieldVisibility: {
        genre: false,
        mood: false,
        tags: false,
        share: false,
        playCount: false
      },
      isDownloadable: true,
      stemOf: parsedMetadata
    }

    const metadata = this.trackUploadHelper.transformTrackUploadMetadata(
      trackMetadata,
      userId
    )

    const populatedMetadata =
      this.trackUploadHelper.populateTrackMetadataWithUploadResponse(
        metadata,
        audioUploadResponse
      )

    return this.writeTrackToChain(
      params.userId,
      populatedMetadata,
      advancedOptions
    )
  }

  /** @hidden
   * Write track upload to chain
   */
  async writeTrackToChain(
    userId: string,
    metadata: ReturnType<
      typeof this.trackUploadHelper.populateTrackMetadataWithUploadResponse
    >,
    advancedOptions?: AdvancedOptions
  ) {
    // Write metadata to chain
    this.logger.info('Writing metadata to chain')

    const entityId =
      metadata.trackId || (await this.trackUploadHelper.generateId('track'))

    const decodedUserId = decodeHashId(userId) ?? undefined

    if (!decodedUserId) {
      throw new Error('writeTrackToChain: userId could not be decoded')
    }

    const response = await this.entityManager.manageEntity({
      userId: decodedUserId,
      entityType: EntityType.TRACK,
      entityId,
      action: Action.CREATE,
      metadata: JSON.stringify({
        cid: '',
        data: {
          ...snakecaseKeys(metadata),
          owner_id: decodedUserId,
          download_conditions:
            metadata.downloadConditions &&
            snakecaseKeys(metadata.downloadConditions),
          stream_conditions:
            metadata.streamConditions &&
            snakecaseKeys(metadata.streamConditions),
          stem_of: metadata.stemOf && snakecaseKeys(metadata.stemOf)
        }
      }),
      ...advancedOptions
    })

    this.logger.info('Successfully uploaded track')
    return {
      ...response,
      trackId: encodeHashId(entityId)!
    }
  }

  /**
   * Upload a track
   */
  async uploadTrack(
    params: UploadTrackRequest,
    advancedOptions?: AdvancedOptions
  ) {
    // Validate inputs
    await parseParams('uploadTrack', UploadTrackSchema)(params)

    // Upload track files
    const { audioUploadResponse, imageUploadResponse } =
      await this.uploadTrackFiles({
        audioFile: params.audioFile,
        imageFile: params.imageFile,
        fileMetadata: {
          placementHosts: params.metadata.placementHosts,
          previewStartSeconds: params.metadata.previewStartSeconds
        },
        onProgress: params.onProgress
      }).start()

    if (!audioUploadResponse || !imageUploadResponse) {
      throw new Error('uploadTrack: Missing upload responses')
    }

    // Write track metadata to chain
    return this.publishTrack(
      {
        userId: params.userId,
        metadata: params.metadata,
        audioUploadResponse,
        imageUploadResponse
      },
      advancedOptions
    )
  }

  /** @hidden
   * Update a track
   */
  async updateTrack(
    params: UpdateTrackRequest,
    advancedOptions?: AdvancedOptions
  ) {
    // Parse inputs
    const {
      userId,
      trackId,
      audioFile,
      imageFile,
      metadata: parsedMetadata,
      onProgress,
      generatePreview
    } = await parseParams('updateTrack', UpdateTrackSchema)(params)

    // Transform metadata
    const metadata = this.trackUploadHelper.transformTrackUploadMetadata(
      parsedMetadata,
      userId
    )

    const { audioUploadResponse, imageUploadResponse } =
      await this.uploadTrackFiles({
        audioFile,
        imageFile,
        fileMetadata: {
          placementHosts: parsedMetadata.placementHosts,
          previewStartSeconds: parsedMetadata.previewStartSeconds
        },
        onProgress
      }).start()

    // Update metadata to include uploaded CIDs
    const updatedMetadata =
      this.trackUploadHelper.populateTrackMetadataWithUploadResponse(
        metadata,
        audioUploadResponse,
        imageUploadResponse
      )

    // Generate preview if requested and no audio file was uploaded
    // (as that would handle the preview generation already)
    if (generatePreview && !audioFile) {
      if (updatedMetadata.previewStartSeconds === undefined) {
        throw new Error('No track preview start time specified')
      }
      if (!updatedMetadata.audioUploadId) {
        throw new Error('Missing required audio_upload_id')
      }

      const previewCid = await retry3(
        async () =>
          await this.storage.generatePreview({
            cid: updatedMetadata.trackCid!,
            secondOffset: updatedMetadata.previewStartSeconds!
          }),
        (e) => {
          this.logger.info('Retrying generatePreview', e)
        }
      )

      // Update metadata to include updated preview CID
      updatedMetadata.previewCid = previewCid
    }

    // Write metadata to chain
    return await this.entityManager.manageEntity({
      userId,
      entityType: EntityType.TRACK,
      entityId: trackId,
      action: Action.UPDATE,
      metadata: JSON.stringify({
        cid: '',
        data: {
          ...snakecaseKeys(updatedMetadata),
          download_conditions:
            updatedMetadata.downloadConditions &&
            snakecaseKeys(updatedMetadata.downloadConditions),
          stream_conditions:
            updatedMetadata.streamConditions &&
            snakecaseKeys(updatedMetadata.streamConditions),
          stem_of: metadata.stemOf && snakecaseKeys(metadata.stemOf)
        }
      }),
      ...advancedOptions
    })
  }

  /** @hidden
   * Delete a track
   */
  async deleteTrack(
    params: DeleteTrackRequest,
    advancedOptions?: AdvancedOptions
  ) {
    // Parse inputs
    const { userId, trackId } = await parseParams(
      'deleteTrack',
      DeleteTrackSchema
    )(params)

    return await this.entityManager.manageEntity({
      userId,
      entityType: EntityType.TRACK,
      entityId: trackId,
      action: Action.DELETE,
      ...advancedOptions
    })
  }

  /** @hidden
   * Favorite a track
   */
  async favoriteTrack(
    params: FavoriteTrackRequest,
    advancedOptions?: AdvancedOptions
  ) {
    // Parse inputs
    const { userId, trackId, metadata } = await parseParams(
      'favoriteTrack',
      FavoriteTrackSchema
    )(params)

    return await this.entityManager.manageEntity({
      userId,
      entityType: EntityType.TRACK,
      entityId: trackId,
      action: Action.SAVE,
      metadata: metadata && JSON.stringify(snakecaseKeys(metadata)),
      ...advancedOptions
    })
  }

  /** @hidden
   * Unfavorite a track
   */
  async unfavoriteTrack(
    params: UnfavoriteTrackRequest,
    advancedOptions?: AdvancedOptions
  ) {
    // Parse inputs
    const { userId, trackId } = await parseParams(
      'unfavoriteTrack',
      UnfavoriteTrackSchema
    )(params)

    return await this.entityManager.manageEntity({
      userId,
      entityType: EntityType.TRACK,
      entityId: trackId,
      action: Action.UNSAVE,
      ...advancedOptions
    })
  }

  /** @hidden
   * Share a track
   */
  async shareTrack(
    params: ShareTrackRequest,
    advancedOptions?: AdvancedOptions
  ) {
    // Parse inputs
    const { userId, trackId } = await parseParams(
      'shareTrack',
      ShareTrackSchema
    )(params)

    return await this.entityManager.manageEntity({
      userId,
      entityType: EntityType.TRACK,
      entityId: trackId,
      action: Action.SHARE,
      ...advancedOptions
    })
  }

  /** @hidden
   * Repost a track
   */
  async repostTrack(
    params: RepostTrackRequest,
    advancedOptions?: AdvancedOptions
  ) {
    // Parse inputs
    const { userId, trackId, metadata } = await parseParams(
      'respostTrack',
      RepostTrackSchema
    )(params)

    return await this.entityManager.manageEntity({
      userId,
      entityType: EntityType.TRACK,
      entityId: trackId,
      action: Action.REPOST,
      metadata: metadata && JSON.stringify(snakecaseKeys(metadata)),
      ...advancedOptions
    })
  }

  /** @hidden
   * Unrepost a track
   */
  async unrepostTrack(
    params: UnrepostTrackRequest,
    advancedOptions?: AdvancedOptions
  ) {
    // Parse inputs
    const { userId, trackId } = await parseParams(
      'unrepostTrack',
      UnrepostTrackSchema
    )(params)

    return await this.entityManager.manageEntity({
      userId,
      entityType: EntityType.TRACK,
      entityId: trackId,
      action: Action.UNREPOST,
      ...advancedOptions
    })
  }

  /**
   * @hidden
   *
   * Records that a track was downloaded.
   */
  public async recordTrackDownload(
    params: RecordTrackDownloadRequest,
    advancedOptions?: AdvancedOptions
  ) {
    const { userId, trackId } = await parseParams(
      'downloadTrack',
      RecordTrackDownloadSchema
    )(params)
    const location = await getLocation({ logger: this.logger })
    return await this.entityManager.manageEntity({
      userId,
      entityType: EntityType.TRACK,
      entityId: trackId,
      action: Action.DOWNLOAD,
      metadata: location
        ? JSON.stringify({
            cid: '',
            data: {
              city: location.city,
              region: location.region,
              country: location.country
            }
          })
        : undefined,
      ...advancedOptions
    })
  }

  /**
   * Gets the Solana instructions that purchase the track
   *
   * @hidden
   */
  public async getPurchaseTrackInstructions(
    params: GetPurchaseTrackInstructionsRequest
  ) {
    const {
      userId,
      trackId,
      price: priceNumber,
      extraAmount: extraAmountNumber = 0
    } = await parseParams(
      'getPurchaseTrackInstructions',
      GetPurchaseTrackInstructionsSchema
    )(params)

    const contentType = 'track'
    const mint = 'USDC'

    // Fetch track
    this.logger.debug('Fetching track purchase info...', { trackId })
    const { data: track } = await this.getTrackAccessInfo({
      trackId: params.trackId, // use hashed trackId
      userId: params.userId // use hashed userId
    })

    // Validate purchase attempt
    if (!track) {
      throw new Error('Track not found.')
    }

    if (!track.isStreamGated && !track.isDownloadGated) {
      throw new Error('Attempted to purchase free track.')
    }

    if (track.userId === params.userId) {
      throw new Error('Attempted to purchase own track.')
    }

    let numberSplits: ExtendedPaymentSplit[] = []
    let centPrice: number
    let accessType: 'stream' | 'download' = 'stream'

    // Get conditions
    if (
      track.streamConditions &&
      instanceOfExtendedPurchaseGate(track.streamConditions)
    ) {
      centPrice = track.streamConditions.usdcPurchase.price
      numberSplits = track.streamConditions.usdcPurchase.splits
    } else if (
      track.downloadConditions &&
      instanceOfExtendedPurchaseGate(track.downloadConditions)
    ) {
      centPrice = track.downloadConditions.usdcPurchase.price
      numberSplits = track.downloadConditions.usdcPurchase.splits
      accessType = 'download'
    } else {
      throw new Error('Track is not available for purchase.')
    }

    // Check if already purchased
    if (
      (accessType === 'download' && track.access?.download) ||
      (accessType === 'stream' && track.access?.stream)
    ) {
      throw new Error('Track already purchased')
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
        contentId: trackId,
        contentType,
        blockNumber: track.blocknumber,
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
   * Purchases stream or download access to a track
   *
   * @hidden
   */
  public async purchaseTrack(params: PurchaseTrackRequest) {
    const { wallet } = await parseParams(
      'purchaseTrack',
      PurchaseTrackSchema
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
    } = await this.getPurchaseTrackInstructions(baseParams)

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

  /**
   * Generates a new track ID
   *
   * @hidden
   */
  async generateTrackId() {
    return this.trackUploadHelper.generateId('track')
  }
}
