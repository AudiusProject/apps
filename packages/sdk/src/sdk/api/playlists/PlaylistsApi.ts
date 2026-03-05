import { pick } from 'lodash'
import snakecaseKeys from 'snakecase-keys'
import type { z } from 'zod'

import { UninitializedEntityManagerError } from '../../errors'
import type { StorageService } from '../../services'
import {
  Action,
  EntityManagerService,
  EntityType,
  AdvancedOptions
} from '../../services/EntityManager/types'
import { decodeHashId, encodeHashId } from '../../utils/hashId'
import { parseParams } from '../../utils/parseParams'
import {
  Configuration,
  PlaylistsApi as GeneratedPlaylistsApi,
  TracksApi,
  type DeletePlaylistRequest,
  type RepostPlaylistRequest,
  type UnrepostPlaylistRequest,
  type FavoritePlaylistRequest,
  type UnfavoritePlaylistRequest,
  type SharePlaylistRequest,
  type UpdateTrackRequestBody,
  type CreateTrackRequestBody
} from '../generated/default'
import { TrackUploadHelper } from '../tracks/TrackUploadHelper'

import {
  AddTrackToPlaylistRequest,
  AddTrackToPlaylistSchema,
  CreatePlaylistSchema,
  EntityManagerDeletePlaylistRequest,
  DeletePlaylistSchema,
  PlaylistMetadata,
  PublishPlaylistRequest,
  PublishPlaylistSchema,
  RemoveTrackFromPlaylistRequest,
  RemoveTrackFromPlaylistSchema,
  EntityManagerRepostPlaylistRequest,
  RepostPlaylistSchema,
  EntityManagerUnrepostPlaylistRequest,
  UnrepostPlaylistSchema,
  EntityManagerFavoritePlaylistRequest,
  FavoritePlaylistSchema,
  EntityManagerUnfavoritePlaylistRequest,
  UnfavoritePlaylistSchema,
  UploadPlaylistSchema,
  UpdatePlaylistSchema,
  UpdatePlaylistMetadataSchema,
  EntityManagerSharePlaylistRequest,
  SharePlaylistSchema,
  EntityManagerCreatePlaylistRequest,
  EntityManagerUpdatePlaylistRequest,
  type UpdatePlaylistRequestWithImage,
  type CreatePlaylistRequestWithFiles,
  type UploadPlaylistRequest,
  type PlaylistsApiServicesConfig
} from './types'

// Returns current timestamp in seconds, which is the expected
// format for client-generated playlist entry timestamps
const getCurrentTimestamp = () => {
  return Math.floor(Date.now() / 1000)
}

export class PlaylistsApi extends GeneratedPlaylistsApi {
  private readonly storage: StorageService
  private readonly entityManager?: EntityManagerService

  private readonly trackUploadHelper: TrackUploadHelper
  private readonly tracksApi: TracksApi

  constructor(
    configuration: Configuration,
    services: PlaylistsApiServicesConfig
  ) {
    super(configuration)
    this.storage = services.storage
    this.entityManager = services.entityManager
    this.tracksApi = new TracksApi(configuration)
    this.trackUploadHelper = new TrackUploadHelper(configuration)
  }

  /** @hidden
   * Create a playlist from existing tracks
   */
  async createPlaylistWithEntityManager(
    params: EntityManagerCreatePlaylistRequest,
    advancedOptions?: AdvancedOptions
  ) {
    return await this.createPlaylistInternal(params, advancedOptions)
  }

  override async createPlaylist(
    params: CreatePlaylistRequestWithFiles,
    requestInit?: RequestInit
  ) {
    if (this.entityManager) {
      return await this.createPlaylistWithEntityManager(params)
    }
    return super.createPlaylist(params, requestInit)
  }

  /** @hidden
   * Upload a playlist
   * Uploads the specified tracks and combines them into a playlist
   */
  async uploadPlaylist(
    params: UploadPlaylistRequest,
    requestInit?: RequestInit
  ) {
    const { metadata: playlistMetadata, trackMetadatas } = params
    const { userId, imageFile, audioFiles, onProgress } = await parseParams(
      'uploadPlaylist',
      UploadPlaylistSchema
    )(params)

    const progresses = audioFiles.map(() => 0)
    const [imageUploadResponse, ...audioUploadResponses] = await Promise.all([
      params.imageFile &&
        this.storage
          .uploadFile({
            file: imageFile,
            onProgress: (event) =>
              onProgress?.(event.loaded / event.total, {
                ...event,
                key: 'image'
              }),
            metadata: {
              template: 'img_square'
            }
          })
          .start(),
      ...audioFiles.map((trackFile, idx) =>
        this.storage
          .uploadFile({
            file: trackFile,
            onProgress: (progress) => {
              progresses[idx] =
                (progress.loaded / progress.total) * 0.5 +
                progress.transcode * 0.5
              const overallProgress =
                progresses.reduce((a, b) => a + b, 0) / audioFiles.length
              onProgress?.(overallProgress, {
                ...progress,
                key: idx
              })
            },
            metadata: {
              template: 'audio',
              placementHosts: trackMetadatas[idx]?.placementHosts,
              previewStartSeconds: trackMetadatas[idx]?.previewStartSeconds
            }
          })
          .start()
      )
    ])

    // Write tracks to chain
    const trackIds = await Promise.all(
      trackMetadatas.map(async (t, i) => {
        // Transform track metadata (cast: SDK upload schema and API body types align at runtime)
        const trackMetadata = this.combineMetadata(
          this.trackUploadHelper.transformTrackUploadMetadataV2(
            t as CreateTrackRequestBody,
            userId
          ),
          playlistMetadata
        )

        const audioResponse = audioUploadResponses[i]

        if (!audioResponse) {
          throw new Error(`Failed to upload track: ${t.title}`)
        }

        // Update metadata to include uploaded CIDs
        const updatedMetadata =
          this.trackUploadHelper.populateTrackMetadataWithUploadResponseV2(
            trackMetadata,
            audioResponse,
            imageUploadResponse
          ) as CreateTrackRequestBody

        if (this.entityManager) {
          const trackId = await this.trackUploadHelper.generateId('track')
          await this.entityManager.manageEntity({
            userId,
            entityType: EntityType.TRACK,
            entityId: trackId,
            action: Action.CREATE,
            metadata: JSON.stringify({
              cid: '',
              data: snakecaseKeys(updatedMetadata)
            })
          })

          return trackId
        }

        const res = await this.tracksApi.createTrack(
          {
            userId: encodeHashId(userId)!,
            metadata: updatedMetadata
          },
          requestInit
        )
        return decodeHashId(res.trackId!)!
      })
    )

    const timestamp = getCurrentTimestamp()

    if (this.entityManager) {
      // Update metadata to include track ids
      const updatedMetadata = {
        ...params.metadata,
        playlistContents: (trackIds ?? []).map((trackId) => ({
          trackId,
          timestamp
        })),
        playlistImageSizesMultihash: imageUploadResponse?.orig_file_cid
      }
      const playlistId = await this.generatePlaylistId()
      // Write playlist metadata to chain
      const response = await this.entityManager.manageEntity({
        userId,
        entityType: EntityType.PLAYLIST,
        entityId: playlistId,
        action: Action.CREATE,
        metadata: JSON.stringify({
          cid: '',
          data: snakecaseKeys(updatedMetadata)
        })
      })

      return {
        ...response,
        playlistId: encodeHashId(playlistId)
      }
    }

    // Update metadata to include track ids
    const updatedMetadata = {
      ...params.metadata,
      playlistContents: (trackIds ?? []).map((trackId) => ({
        trackId: encodeHashId(trackId)!,
        timestamp,
        metadataTimestamp: timestamp
      })),
      playlistImageSizesMultihash: imageUploadResponse?.orig_file_cid
    }
    return super.createPlaylist(
      {
        userId: encodeHashId(userId)!,
        metadata: updatedMetadata
      },
      requestInit
    )
  }

  /** @hidden
   * Publish a playlist
   * Changes a playlist from private to public
   */
  async publishPlaylist(
    params: PublishPlaylistRequest,
    advancedOptions?: AdvancedOptions
  ) {
    // Parse inputs
    await parseParams('publishPlaylist', PublishPlaylistSchema)(params)

    return await this.fetchAndUpdatePlaylist(
      {
        userId: params.userId,
        playlistId: params.playlistId,
        updateMetadata: (playlist) => ({
          ...playlist,
          isPrivate: false
        })
      },
      advancedOptions
    )
  }

  /** @hidden
   * Add a single track to the end of a playlist
   * For more control use updatePlaylist
   */
  async addTrackToPlaylist(
    params: AddTrackToPlaylistRequest,
    advancedOptions?: AdvancedOptions
  ) {
    // Parse inputs
    await parseParams('addTrackToPlaylist', AddTrackToPlaylistSchema)(params)

    return await this.fetchAndUpdatePlaylist(
      {
        userId: params.userId,
        playlistId: params.playlistId,
        updateMetadata: (playlist) => ({
          ...playlist,
          playlistContents: [
            ...(playlist.playlistContents ?? []),
            {
              trackId: params.trackId,
              timestamp: getCurrentTimestamp()
            }
          ]
        })
      },
      advancedOptions
    )
  }

  /** @hidden
   * Removes a single track at the given index of playlist
   * For more control use updatePlaylist
   */
  async removeTrackFromPlaylist(
    params: RemoveTrackFromPlaylistRequest,
    advancedOptions?: AdvancedOptions
  ) {
    // Parse inputs
    const { trackIndex } = await parseParams(
      'removeTrackFromPlaylist',
      RemoveTrackFromPlaylistSchema
    )(params)

    return await this.fetchAndUpdatePlaylist(
      {
        userId: params.userId,
        playlistId: params.playlistId,
        updateMetadata: (playlist) => {
          if (
            !playlist.playlistContents ||
            playlist.playlistContents.length <= trackIndex
          ) {
            throw new Error(`No track exists at index ${trackIndex}`)
          }
          playlist.playlistContents.splice(trackIndex, 1)
          return {
            ...playlist,
            playlistContents: playlist.playlistContents
          }
        }
      },
      advancedOptions
    )
  }

  /** @hidden
   * Update a playlist
   */
  async updatePlaylistWithEntityManager(
    params: EntityManagerUpdatePlaylistRequest,
    advancedOptions?: AdvancedOptions
  ) {
    // Parse inputs
    const parsedParameters = await parseParams(
      'updatePlaylist',
      UpdatePlaylistSchema
    )(params)

    if (!this.entityManager) {
      throw new UninitializedEntityManagerError()
    }
    return await this.entityManager.manageEntity({
      userId: parsedParameters.userId,
      entityType: EntityType.PLAYLIST,
      entityId: parsedParameters.playlistId,
      action: Action.UPDATE,
      metadata: JSON.stringify({
        cid: '',
        data: snakecaseKeys(parsedParameters.metadata)
      }),
      ...advancedOptions
    })
  }

  override async updatePlaylist(
    params: UpdatePlaylistRequestWithImage,
    requestInit?: RequestInit
  ) {
    // Upload art
    const metadata = params.metadata
    if (params.imageFile) {
      const res = await this.storage
        .uploadFile({
          file: params.imageFile,
          onProgress: (event) =>
            params.onProgress?.(event.loaded / event.total, {
              ...event,
              key: 'image'
            }),
          metadata: {
            template: 'img_square'
          }
        })
        .start()
      metadata.playlistImageSizesMultihash = res.orig_file_cid
    }

    if (this.entityManager) {
      return await this.updatePlaylistWithEntityManager({
        userId: params.userId,
        playlistId: params.playlistId,
        metadata
      })
    }
    return super.updatePlaylist(params, requestInit)
  }

  /** @hidden
   * Delete a playlist
   */
  async deletePlaylistWithEntityManager(
    params: EntityManagerDeletePlaylistRequest,
    advancedOptions?: AdvancedOptions
  ) {
    // Parse inputs
    const { userId, playlistId } = await parseParams(
      'deletePlaylist',
      DeletePlaylistSchema
    )(params)

    if (!this.entityManager) {
      throw new UninitializedEntityManagerError()
    }
    return await this.entityManager.manageEntity({
      userId,
      entityType: EntityType.PLAYLIST,
      entityId: playlistId,
      action: Action.DELETE,
      ...advancedOptions
    })
  }

  override async deletePlaylist(
    params: DeletePlaylistRequest,
    requestInit?: RequestInit
  ) {
    if (this.entityManager) {
      return await this.deletePlaylistWithEntityManager(params)
    }
    return super.deletePlaylist(params, requestInit)
  }

  /** @hidden
   * Favorite a playlist
   */
  async favoritePlaylistWithEntityManager(
    params: EntityManagerFavoritePlaylistRequest,
    advancedOptions?: AdvancedOptions
  ) {
    // Parse inputs
    const { userId, playlistId, metadata } = await parseParams(
      'favoritePlaylist',
      FavoritePlaylistSchema
    )(params)

    if (!this.entityManager) {
      throw new UninitializedEntityManagerError()
    }
    return await this.entityManager.manageEntity({
      userId,
      entityType: EntityType.PLAYLIST,
      entityId: playlistId,
      action: Action.SAVE,
      metadata: metadata && JSON.stringify(snakecaseKeys(metadata)),
      ...advancedOptions
    })
  }

  override async favoritePlaylist(
    params: FavoritePlaylistRequest,
    requestInit?: RequestInit
  ) {
    if (this.entityManager) {
      return await this.favoritePlaylistWithEntityManager(params)
    }
    return super.favoritePlaylist(params, requestInit)
  }

  /** @hidden
   * Unfavorite a playlist
   */
  async unfavoritePlaylistWithEntityManager(
    params: EntityManagerUnfavoritePlaylistRequest,
    advancedOptions?: AdvancedOptions
  ) {
    // Parse inputs
    const { userId, playlistId } = await parseParams(
      'unfavoritePlaylist',
      UnfavoritePlaylistSchema
    )(params)

    if (!this.entityManager) {
      throw new UninitializedEntityManagerError()
    }
    return await this.entityManager.manageEntity({
      userId,
      entityType: EntityType.PLAYLIST,
      entityId: playlistId,
      action: Action.UNSAVE,
      ...advancedOptions
    })
  }

  override async unfavoritePlaylist(
    params: UnfavoritePlaylistRequest,
    requestInit?: RequestInit
  ) {
    if (this.entityManager) {
      return await this.unfavoritePlaylistWithEntityManager(params)
    }
    return super.unfavoritePlaylist(params, requestInit)
  }

  /** @hidden
   * Repost a playlist
   */
  async repostPlaylistWithEntityManager(
    params: EntityManagerRepostPlaylistRequest,
    advancedOptions?: AdvancedOptions
  ) {
    // Parse inputs
    const { userId, playlistId, metadata } = await parseParams(
      'repostPlaylist',
      RepostPlaylistSchema
    )(params)

    if (!this.entityManager) {
      throw new UninitializedEntityManagerError()
    }
    return await this.entityManager.manageEntity({
      userId,
      entityType: EntityType.PLAYLIST,
      entityId: playlistId,
      action: Action.REPOST,
      metadata: metadata && JSON.stringify(snakecaseKeys(metadata)),
      ...advancedOptions
    })
  }

  override async repostPlaylist(
    params: RepostPlaylistRequest,
    requestInit?: RequestInit
  ) {
    if (this.entityManager) {
      // Map repostRequestBody (generated API) to metadata (entity manager schema)
      const entityManagerParams = {
        playlistId: params.playlistId,
        userId: params.userId,
        metadata: params.repostRequestBody
      }
      return await this.repostPlaylistWithEntityManager(entityManagerParams)
    }
    return super.repostPlaylist(params, requestInit)
  }

  /** @hidden
   * Unrepost a playlist
   */
  async unrepostPlaylistWithEntityManager(
    params: EntityManagerUnrepostPlaylistRequest,
    advancedOptions?: AdvancedOptions
  ) {
    // Parse inputs
    const { userId, playlistId } = await parseParams(
      'unrepostPlaylist',
      UnrepostPlaylistSchema
    )(params)

    if (!this.entityManager) {
      throw new UninitializedEntityManagerError()
    }
    return await this.entityManager.manageEntity({
      userId,
      entityType: EntityType.PLAYLIST,
      entityId: playlistId,
      action: Action.UNREPOST,
      ...advancedOptions
    })
  }

  override async unrepostPlaylist(
    params: UnrepostPlaylistRequest,
    requestInit?: RequestInit
  ) {
    if (this.entityManager) {
      return await this.unrepostPlaylistWithEntityManager(params)
    }
    return super.unrepostPlaylist(params, requestInit)
  }

  /** @hidden
   * Share a playlist
   */
  async sharePlaylistWithEntityManager(
    params: EntityManagerSharePlaylistRequest,
    advancedOptions?: AdvancedOptions
  ) {
    // Parse inputs
    const { userId, playlistId } = await parseParams(
      'sharePlaylist',
      SharePlaylistSchema
    )(params)

    if (!this.entityManager) {
      throw new UninitializedEntityManagerError()
    }
    return await this.entityManager.manageEntity({
      userId,
      entityType: EntityType.PLAYLIST,
      entityId: playlistId,
      action: Action.SHARE,
      ...advancedOptions
    })
  }

  override async sharePlaylist(
    params: SharePlaylistRequest,
    requestInit?: RequestInit
  ) {
    if (this.entityManager) {
      return await this.sharePlaylistWithEntityManager(params)
    }
    return super.sharePlaylist(params, requestInit)
  }

  /** @internal
   * Combines the metadata for a track and a collection (playlist or album),
   * taking the metadata from the playlist when the track is missing it.
   */
  private combineMetadata<
    T extends CreateTrackRequestBody | UpdateTrackRequestBody
  >(trackMetadata: T, playlistMetadata: PlaylistMetadata) {
    const metadata = trackMetadata

    if (!metadata.mood) metadata.mood = playlistMetadata.mood

    if (playlistMetadata.tags) {
      if (!metadata.tags) {
        // Take playlist tags
        metadata.tags = playlistMetadata.tags
      } else {
        // Combine tags and dedupe
        metadata.tags = [
          ...new Set([
            ...metadata.tags.split(','),
            ...playlistMetadata.tags.split(',')
          ])
        ].join(',')
      }
    }
    return trackMetadata
  }

  /** @internal
   * Update helper method that first fetches a playlist and then updates it
   */
  private async fetchAndUpdatePlaylist(
    {
      userId,
      playlistId,
      updateMetadata
    }: {
      userId: string
      playlistId: string
      updateMetadata: (
        fetchedMetadata: EntityManagerUpdatePlaylistRequest['metadata']
      ) => EntityManagerUpdatePlaylistRequest['metadata']
    },
    advancedOptions?: AdvancedOptions
  ) {
    // Fetch playlist
    const playlistResponse = await this.getPlaylist({
      playlistId,
      userId
    })
    const playlist = playlistResponse.data?.[0]

    if (!playlist) {
      throw new Error(`Could not fetch playlist: ${playlistId}`)
    }

    const supportedUpdateFields = Object.keys(
      UpdatePlaylistMetadataSchema.shape
    )

    const picked = pick(playlist, supportedUpdateFields) as Record<
      string,
      unknown
    >
    const metadataForUpdate: EntityManagerUpdatePlaylistRequest['metadata'] = {
      ...picked,
      ...(picked.releaseDate != null
        ? {
            releaseDate:
              typeof picked.releaseDate === 'string'
                ? new Date(picked.releaseDate)
                : (picked.releaseDate as Date)
          }
        : {})
    }

    return await this.updatePlaylistWithEntityManager(
      {
        userId,
        playlistId,
        metadata: updateMetadata(metadataForUpdate)
      },
      advancedOptions
    )
  }

  /** @internal
   * Method to create a playlist from raw inputs, parsing them with CreatePlaylistSchema
   * This is used for both playlists and albums
   */
  public async createPlaylistInternal(
    params: z.input<typeof CreatePlaylistSchema>,
    advancedOptions?: AdvancedOptions
  ) {
    const { userId, imageFile, metadata, onProgress } = await parseParams(
      'createPlaylistInternal',
      CreatePlaylistSchema
    )(params)

    // Upload cover art to storage node
    const coverArtResponse =
      imageFile &&
      (await this.storage
        .uploadFile({
          file: imageFile,
          onProgress: (event) =>
            onProgress?.(event.loaded / event.total, {
              ...event,
              key: 'image'
            }),
          metadata: {
            template: 'img_square'
          }
        })
        .start())

    const providedPlaylistId = metadata.playlistId
    const playlistId = providedPlaylistId || (await this.generatePlaylistId())

    const updatedMetadata = {
      ...metadata,
      playlistImageSizesMultihash: coverArtResponse?.orig_file_cid
    }

    if (!this.entityManager) {
      throw new UninitializedEntityManagerError()
    }
    // Write playlist metadata to chain
    const response = await this.entityManager.manageEntity({
      userId,
      entityType: EntityType.PLAYLIST,
      entityId: playlistId,
      action: Action.CREATE,
      metadata: JSON.stringify({
        cid: '',
        data: snakecaseKeys(updatedMetadata)
      }),
      ...advancedOptions
    })

    return {
      ...response,
      playlistId: encodeHashId(playlistId) ?? undefined
    }
  }

  /**
   * Generates a new playlist ID
   *
   * @hidden
   */
  async generatePlaylistId() {
    return this.trackUploadHelper.generateId('playlist')
  }
}
