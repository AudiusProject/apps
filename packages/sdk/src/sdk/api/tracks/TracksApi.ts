import { USDC } from '@audius/fixed-decimal'
import { TransactionInstruction } from '@solana/web3.js'
import snakecaseKeys from 'snakecase-keys'

import { UninitializedEntityManagerError } from '../../errors'
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
import { Logger, type LoggerService } from '../../services/Logger'
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
  instanceOfExtendedPurchaseGate,
  type DeleteTrackRequest,
  type FavoriteTrackRequest,
  type UnfavoriteTrackRequest,
  type ShareTrackRequest,
  type RepostTrackRequest,
  type UnrepostTrackRequest,
  type RecordTrackDownloadRequest
} from '../generated/default'
import type { UpdateTrackRequest as GeneratedUpdateTrackRequest } from '../generated/default/apis/TracksApi'
import { RequiredError } from '../generated/default/runtime'

import { TrackUploadHelper } from './TrackUploadHelper'
import {
  EntityManagerDeleteTrackRequest,
  DeleteTrackSchema,
  EntityManagerRepostTrackRequest,
  RepostTrackSchema,
  EntityManagerFavoriteTrackRequest,
  FavoriteTrackSchema,
  EntityManagerUnrepostTrackRequest,
  UnrepostTrackSchema,
  EntityManagerUnfavoriteTrackRequest,
  UnfavoriteTrackSchema,
  EntityManagerUpdateTrackRequest,
  PurchaseTrackRequest,
  PurchaseTrackSchema,
  GetPurchaseTrackInstructionsRequest,
  GetPurchaseTrackInstructionsSchema,
  EntityManagerRecordTrackDownloadRequest,
  RecordTrackDownloadSchema,
  UploadTrackFilesRequest,
  UpdateTrackSchema,
  UploadTrackFilesSchema,
  ShareTrackSchema,
  EntityManagerShareTrackRequest,
  type PublishTrackRequest,
  PublishTrackSchema,
  type PublishStemRequest,
  type UploadTrackFilesTask,
  type UpdateTrackRequestWithFiles,
  type CreateTrackRequestWithFiles,
  PublishStemSchema,
  UploadTrackSchema,
  type TracksApiServicesConfig
} from './types'

// Extend that new class
export class TracksApi extends GeneratedTracksApi {
  private readonly trackUploadHelper: TrackUploadHelper

  private readonly storage: StorageService
  private readonly entityManager?: EntityManagerService
  private readonly logger: LoggerService
  private readonly claimableTokensClient: ClaimableTokensClient
  private readonly paymentRouterClient: PaymentRouterClient
  private readonly solanaRelay: SolanaRelayService
  private readonly solanaClient: SolanaClient

  constructor(configuration: Configuration, services: TracksApiServicesConfig) {
    super(configuration)
    this.trackUploadHelper = new TrackUploadHelper(configuration)
    this.logger = (services.logger ?? new Logger()).createPrefixedLogger(
      '[tracks-api]'
    )
    this.storage = services.storage
    this.entityManager = services.entityManager
    this.claimableTokensClient = services.claimableTokensClient
    this.paymentRouterClient = services.paymentRouterClient
    this.solanaRelay = services.solanaRelay
    this.solanaClient = services.solanaClient
  }

  /**
   * Get download counts for tracks by ID (bulk). Use this instead of loading
   * full track objects when only download counts are needed.
   */
  async getTrackDownloadCounts(params: {
    trackIds: string[]
  }): Promise<{ id: string; download_count: number }[]> {
    if (!params.trackIds?.length) return []
    const response = await this.request({
      path: '/tracks/download_counts',
      method: 'GET',
      query: { id: params.trackIds }
    })
    const json = await response.json()
    const data = json?.data ?? []
    return Array.isArray(data) ? data : []
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

    if (
      !populatedMetadata.previewCid &&
      populatedMetadata.previewStartSeconds !== undefined &&
      populatedMetadata.trackCid
    ) {
      const previewCid = await retry3(
        async () =>
          await this.storage.generatePreview({
            cid: populatedMetadata.trackCid!,
            secondOffset: populatedMetadata.previewStartSeconds!
          }),
        (e) => {
          this.logger.info('Retrying generatePreview', e)
        }
      )
      populatedMetadata.previewCid = previewCid
    }

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

    if (!this.entityManager) {
      throw new UninitializedEntityManagerError()
    }
    const response = await this.entityManager.manageEntity({
      userId: decodedUserId,
      entityType: EntityType.TRACK,
      entityId,
      action: Action.CREATE,
      metadata: JSON.stringify({
        cid: '',
        access_authorities: metadata.accessAuthorities,
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

  override async createTrack(
    params: CreateTrackRequestWithFiles,
    requestInit?: RequestInit
  ) {
    // Upload files
    let metadata = params.metadata
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

    metadata = this.trackUploadHelper.transformTrackUploadMetadataV2(
      metadata,
      decodeHashId(params.userId)!
    )

    metadata = this.trackUploadHelper.populateTrackMetadataWithUploadResponseV2(
      metadata,
      audioUploadResponse,
      imageUploadResponse
    )

    if (this.entityManager) {
      const { metadata } = await parseParams(
        'createTrack',
        UploadTrackSchema
      )(params)
      return this.writeTrackToChain(params.userId, metadata)
    }
    return super.createTrack(
      {
        userId: params.userId,
        metadata
      },
      requestInit
    )
  }

  /** @hidden
   * Update a track with entity manager
   */
  async updateTrackWithEntityManager(
    params: EntityManagerUpdateTrackRequest,
    advancedOptions?: AdvancedOptions
  ) {
    // Parse inputs
    const { userId, trackId, metadata } = await parseParams(
      'updateTrack',
      UpdateTrackSchema
    )(params)

    if (!this.entityManager) {
      throw new UninitializedEntityManagerError()
    }
    // Write metadata to chain
    return await this.entityManager.manageEntity({
      userId,
      entityType: EntityType.TRACK,
      entityId: trackId,
      action: Action.UPDATE,
      metadata: JSON.stringify({
        cid: '',
        access_authorities: metadata.accessAuthorities,
        data: {
          ...snakecaseKeys(metadata),
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
  }

  override async updateTrack(
    params: UpdateTrackRequestWithFiles,
    requestInit?: RequestInit
  ) {
    // Upload files
    let metadata = params.metadata
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

    metadata = this.trackUploadHelper.transformTrackUploadMetadataV2(
      metadata,
      decodeHashId(params.userId)!
    )

    metadata = this.trackUploadHelper.populateTrackMetadataWithUploadResponseV2(
      metadata,
      audioUploadResponse,
      imageUploadResponse
    )

    // Generate preview if requested and no audio file was uploaded
    // (as that would handle the preview generation already)
    if (
      params.generatePreview &&
      metadata.previewStartSeconds !== undefined &&
      !params.audioFile
    ) {
      const previewCid = await retry3(
        async () =>
          await this.storage.generatePreview({
            cid: metadata.trackCid!,
            secondOffset: metadata.previewStartSeconds!
          }),
        (e) => {
          this.logger.info('Retrying generatePreview', e)
        }
      )

      // Update metadata to include updated preview CID
      metadata.previewCid = previewCid
    }

    if (this.entityManager) {
      return await this.updateTrackWithEntityManager({
        trackId: params.trackId,
        userId: params.userId,
        metadata: metadata as EntityManagerUpdateTrackRequest['metadata']
      })
    }
    const updateRequest: GeneratedUpdateTrackRequest = {
      trackId: params.trackId,
      userId: params.userId,
      metadata:
        params.metadata as unknown as GeneratedUpdateTrackRequest['metadata']
    }
    return super.updateTrack(updateRequest, requestInit)
  }

  /** @hidden
   * Delete a track
   */
  async deleteTrackWithEntityManager(
    params: EntityManagerDeleteTrackRequest,
    advancedOptions?: AdvancedOptions
  ) {
    // Parse inputs
    const { userId, trackId } = await parseParams(
      'deleteTrack',
      DeleteTrackSchema
    )(params)

    if (!this.entityManager) {
      throw new UninitializedEntityManagerError()
    }
    return await this.entityManager.manageEntity({
      userId,
      entityType: EntityType.TRACK,
      entityId: trackId,
      action: Action.DELETE,
      ...advancedOptions
    })
  }

  override async deleteTrack(
    params: DeleteTrackRequest,
    requestInit?: RequestInit
  ) {
    if (this.entityManager) {
      return await this.deleteTrackWithEntityManager(params)
    }
    return super.deleteTrack(params, requestInit)
  }

  /** @hidden
   * Favorite a track
   */
  async favoriteTrackWithEntityManager(
    params: EntityManagerFavoriteTrackRequest,
    advancedOptions?: AdvancedOptions
  ) {
    // Parse inputs
    const { userId, trackId, metadata } = await parseParams(
      'favoriteTrack',
      FavoriteTrackSchema
    )(params)

    if (!this.entityManager) {
      throw new UninitializedEntityManagerError()
    }
    return await this.entityManager.manageEntity({
      userId,
      entityType: EntityType.TRACK,
      entityId: trackId,
      action: Action.SAVE,
      metadata: metadata && JSON.stringify(snakecaseKeys(metadata)),
      ...advancedOptions
    })
  }

  override async favoriteTrack(
    params: FavoriteTrackRequest,
    requestInit?: RequestInit
  ) {
    if (this.entityManager) {
      return await this.favoriteTrackWithEntityManager(params)
    }
    return super.favoriteTrack(params, requestInit)
  }

  /** @hidden
   * Unfavorite a track
   */
  async unfavoriteTrackWithEntityManager(
    params: EntityManagerUnfavoriteTrackRequest,
    advancedOptions?: AdvancedOptions
  ) {
    // Parse inputs
    const { userId, trackId } = await parseParams(
      'unfavoriteTrack',
      UnfavoriteTrackSchema
    )(params)

    if (!this.entityManager) {
      throw new UninitializedEntityManagerError()
    }
    return await this.entityManager.manageEntity({
      userId,
      entityType: EntityType.TRACK,
      entityId: trackId,
      action: Action.UNSAVE,
      ...advancedOptions
    })
  }

  override async unfavoriteTrack(
    params: UnfavoriteTrackRequest,
    requestInit?: RequestInit
  ) {
    if (this.entityManager) {
      return await this.unfavoriteTrackWithEntityManager(params)
    }
    return super.unfavoriteTrack(params, requestInit)
  }

  /** @hidden
   * Share a track
   */
  async shareTrackWithEntityManager(
    params: EntityManagerShareTrackRequest,
    advancedOptions?: AdvancedOptions
  ) {
    // Parse inputs
    const { userId, trackId } = await parseParams(
      'shareTrack',
      ShareTrackSchema
    )(params)

    if (!this.entityManager) {
      throw new UninitializedEntityManagerError()
    }
    return await this.entityManager.manageEntity({
      userId,
      entityType: EntityType.TRACK,
      entityId: trackId,
      action: Action.SHARE,
      ...advancedOptions
    })
  }

  override async shareTrack(
    params: ShareTrackRequest,
    requestInit?: RequestInit
  ) {
    if (this.entityManager) {
      return await this.shareTrackWithEntityManager(params)
    }
    return super.shareTrack(params, requestInit)
  }

  /** @hidden
   * Repost a track
   */
  async repostTrackWithEntityManager(
    params: EntityManagerRepostTrackRequest,
    advancedOptions?: AdvancedOptions
  ) {
    // Parse inputs
    const { userId, trackId, metadata } = await parseParams(
      'respostTrack',
      RepostTrackSchema
    )(params)

    if (!this.entityManager) {
      throw new UninitializedEntityManagerError()
    }
    return await this.entityManager.manageEntity({
      userId,
      entityType: EntityType.TRACK,
      entityId: trackId,
      action: Action.REPOST,
      metadata: metadata && JSON.stringify(snakecaseKeys(metadata)),
      ...advancedOptions
    })
  }

  override async repostTrack(
    params: RepostTrackRequest,
    requestInit?: RequestInit
  ) {
    if (this.entityManager) {
      const entityManagerParams = {
        trackId: params.trackId,
        userId: params.userId,
        metadata: params.repostRequestBody
      }
      return await this.repostTrackWithEntityManager(entityManagerParams)
    }
    return super.repostTrack(params, requestInit)
  }

  /** @hidden
   * Unrepost a track
   */
  async unrepostTrackWithEntityManager(
    params: EntityManagerUnrepostTrackRequest,
    advancedOptions?: AdvancedOptions
  ) {
    // Parse inputs
    const { userId, trackId } = await parseParams(
      'unrepostTrack',
      UnrepostTrackSchema
    )(params)

    if (!this.entityManager) {
      throw new UninitializedEntityManagerError()
    }
    return await this.entityManager.manageEntity({
      userId,
      entityType: EntityType.TRACK,
      entityId: trackId,
      action: Action.UNREPOST,
      ...advancedOptions
    })
  }

  override async unrepostTrack(
    params: UnrepostTrackRequest,
    requestInit?: RequestInit
  ) {
    if (this.entityManager) {
      return await this.unrepostTrackWithEntityManager(params)
    }
    return super.unrepostTrack(params, requestInit)
  }

  /**
   * @hidden
   *
   * Records that a track was downloaded.
   */
  public async recordTrackDownloadWithEntityManager(
    params: EntityManagerRecordTrackDownloadRequest,
    advancedOptions?: AdvancedOptions
  ) {
    const { userId, trackId } = await parseParams(
      'downloadTrack',
      RecordTrackDownloadSchema
    )(params)
    const location = await getLocation({ logger: this.logger })

    if (!this.entityManager) {
      throw new UninitializedEntityManagerError()
    }
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

  override async recordTrackDownload(
    params: RecordTrackDownloadRequest,
    requestInit?: RequestInit
  ) {
    if (this.entityManager) {
      return await this.recordTrackDownloadWithEntityManager(params)
    }
    return super.recordTrackDownload(params, requestInit)
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
      trackId: encodeHashId(trackId)!, // use hashed trackId
      userId: encodeHashId(userId)! // use hashed userId
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
