import { pick } from 'lodash'
import snakecaseKeys from 'snakecase-keys'
import type { z } from 'zod'

import type { StorageService } from '../../services'
import {
  Action,
  EntityManagerService,
  EntityType,
  AdvancedOptions
} from '../../services/EntityManager/types'
import type { LoggerService } from '../../services/Logger'
import { encodeHashId } from '../../utils/hashId'
import { parseParams } from '../../utils/parseParams'
import { retry3 } from '../../utils/retry'
import {
  Configuration,
  PlaylistsApi as GeneratedPlaylistsApi
} from '../generated/default'
import { TrackUploadHelper } from '../tracks/TrackUploadHelper'

import {
  AddTrackToPlaylistRequest,
  AddTrackToPlaylistSchema,
  CreatePlaylistRequest,
  CreatePlaylistSchema,
  DeletePlaylistRequest,
  DeletePlaylistSchema,
  PlaylistMetadata,
  PlaylistTrackMetadata,
  PublishPlaylistRequest,
  PublishPlaylistSchema,
  RemoveTrackFromPlaylistRequest,
  RemoveTrackFromPlaylistSchema,
  RepostPlaylistRequest,
  RepostPlaylistSchema,
  FavoritePlaylistRequest,
  FavoritePlaylistSchema,
  UnrepostPlaylistSchema,
  UnfavoritePlaylistRequest,
  UnfavoritePlaylistSchema,
  UpdatePlaylistRequest,
  UploadPlaylistRequest,
  UploadPlaylistSchema,
  UpdatePlaylistSchema,
  UpdatePlaylistMetadataSchema,
  SharePlaylistRequest,
  SharePlaylistSchema
} from './types'

// Returns current timestamp in seconds, which is the expected
// format for client-generated playlist entry timestamps
const getCurrentTimestamp = () => {
  return Math.floor(Date.now() / 1000)
}

export class PlaylistsApi extends GeneratedPlaylistsApi {
  private readonly trackUploadHelper: TrackUploadHelper

  constructor(
    configuration: Configuration,
    private readonly storage: StorageService,
    private readonly entityManager: EntityManagerService,
    private readonly logger: LoggerService
  ) {
    super(configuration)
    this.trackUploadHelper = new TrackUploadHelper(configuration)
    this.logger = logger.createPrefixedLogger('[playlists-api]')
  }

  /** @hidden
   * Create a playlist from existing tracks
   */
  async createPlaylist(
    params: CreatePlaylistRequest,
    advancedOptions?: AdvancedOptions
  ) {
    // Parse inputs
    const parsedParameters = await parseParams(
      'createPlaylist',
      CreatePlaylistSchema
    )(params)

    // Call createPlaylistInternal with parsed inputs
    return await this.createPlaylistInternal(parsedParameters, advancedOptions)
  }

  /** @hidden
   * Upload a playlist
   * Uploads the specified tracks and combines them into a playlist
   */
  async uploadPlaylist(
    params: UploadPlaylistRequest,
    advancedOptions?: AdvancedOptions
  ) {
    // Parse inputs
    const parsedParameters = await parseParams(
      'uploadPlaylist',
      UploadPlaylistSchema
    )(params)

    // Call uploadPlaylistInternal with parsed inputs
    return await this.uploadPlaylistInternal(parsedParameters, advancedOptions)
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
  async updatePlaylist(
    params: UpdatePlaylistRequest,
    advancedOptions?: AdvancedOptions
  ) {
    // Parse inputs
    const parsedParameters = await parseParams(
      'updatePlaylist',
      UpdatePlaylistSchema
    )(params)

    // Call updatePlaylistInternal with parsed inputs
    return await this.updatePlaylistInternal(parsedParameters, advancedOptions)
  }

  /** @hidden
   * Delete a playlist
   */
  async deletePlaylist(
    params: DeletePlaylistRequest,
    advancedOptions?: AdvancedOptions
  ) {
    // Parse inputs
    const { userId, playlistId } = await parseParams(
      'deletePlaylist',
      DeletePlaylistSchema
    )(params)

    return await this.entityManager.manageEntity({
      userId,
      entityType: EntityType.PLAYLIST,
      entityId: playlistId,
      action: Action.DELETE,
      ...advancedOptions
    })
  }

  /** @hidden
   * Favorite a playlist
   */
  async favoritePlaylist(
    params: FavoritePlaylistRequest,
    advancedOptions?: AdvancedOptions
  ) {
    // Parse inputs
    const { userId, playlistId, metadata } = await parseParams(
      'favoritePlaylist',
      FavoritePlaylistSchema
    )(params)

    return await this.entityManager.manageEntity({
      userId,
      entityType: EntityType.PLAYLIST,
      entityId: playlistId,
      action: Action.SAVE,
      metadata: metadata && JSON.stringify(snakecaseKeys(metadata)),
      ...advancedOptions
    })
  }

  /** @hidden
   * Unfavorite a playlist
   */
  async unfavoritePlaylist(
    params: UnfavoritePlaylistRequest,
    advancedOptions?: AdvancedOptions
  ) {
    // Parse inputs
    const { userId, playlistId } = await parseParams(
      'unfavoritePlaylist',
      UnfavoritePlaylistSchema
    )(params)

    return await this.entityManager.manageEntity({
      userId,
      entityType: EntityType.PLAYLIST,
      entityId: playlistId,
      action: Action.UNSAVE,
      ...advancedOptions
    })
  }

  /** @hidden
   * Repost a playlist
   */
  async repostPlaylist(
    params: RepostPlaylistRequest,
    advancedOptions?: AdvancedOptions
  ) {
    // Parse inputs
    const { userId, playlistId, metadata } = await parseParams(
      'respostPlaylist',
      RepostPlaylistSchema
    )(params)

    return await this.entityManager.manageEntity({
      userId,
      entityType: EntityType.PLAYLIST,
      entityId: playlistId,
      action: Action.REPOST,
      metadata: metadata && JSON.stringify(snakecaseKeys(metadata)),
      ...advancedOptions
    })
  }

  /** @hidden
   * Unrepost a playlist
   */
  async unrepostPlaylist(
    params: FavoritePlaylistRequest,
    advancedOptions?: AdvancedOptions
  ) {
    // Parse inputs
    const { userId, playlistId } = await parseParams(
      'unrepostPlaylist',
      UnrepostPlaylistSchema
    )(params)

    return await this.entityManager.manageEntity({
      userId,
      entityType: EntityType.PLAYLIST,
      entityId: playlistId,
      action: Action.UNREPOST,
      ...advancedOptions
    })
  }

  /** @hidden
   * Share a playlist
   */
  async sharePlaylist(
    params: SharePlaylistRequest,
    advancedOptions?: AdvancedOptions
  ) {
    // Parse inputs
    const { userId, playlistId } = await parseParams(
      'sharePlaylist',
      SharePlaylistSchema
    )(params)

    return await this.entityManager.manageEntity({
      userId,
      entityType: EntityType.PLAYLIST,
      entityId: playlistId,
      action: Action.SHARE,
      ...advancedOptions
    })
  }

  /** @internal
   * Combines the metadata for a track and a collection (playlist or album),
   * taking the metadata from the playlist when the track is missing it.
   */
  private combineMetadata(
    trackMetadata: PlaylistTrackMetadata,
    playlistMetadata: PlaylistMetadata
  ) {
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
        fetchedMetadata: UpdatePlaylistRequest['metadata']
      ) => UpdatePlaylistRequest['metadata']
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

    return await this.updatePlaylist(
      {
        userId,
        playlistId,
        metadata: updateMetadata(pick(playlist, supportedUpdateFields))
      },
      advancedOptions
    )
  }

  /** @internal
   * Method to upload a playlist with already parsed inputs
   * This is used for both playlists and albums
   */
  public async uploadPlaylistInternal<Metadata extends PlaylistMetadata>(
    {
      userId,
      imageFile,
      audioFiles,
      onProgress,
      metadata,
      trackMetadatas
    }: z.infer<typeof UploadPlaylistSchema> & {
      metadata: Metadata
    },
    advancedOptions?: AdvancedOptions
  ) {
    const progresses = audioFiles.map(() => 0)
    // Upload track audio and cover art to storage node
    const [coverArtResponse, ...audioResponses] = await Promise.all([
      retry3(
        async () =>
          await this.storage
            .uploadFile({
              file: imageFile,
              onProgress: (progress) =>
                onProgress?.(
                  progresses.reduce((a, b) => a + b, 0) / audioFiles.length,
                  { ...progress, key: 'image' }
                ),
              metadata: {
                template: 'img_square'
              }
            })
            .start(),
        (e) => {
          this.logger.info('Retrying uploadPlaylistCoverArt', e)
        }
      ),
      ...audioFiles.map(
        async (trackFile, idx) =>
          await retry3(
            async () =>
              await this.storage
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
                    ...this.trackUploadHelper.extractMediorumUploadOptions(
                      trackMetadatas[idx]!
                    )
                  }
                })
                .start(),
            (e) => {
              this.logger.info('Retrying uploadTrackAudio', e)
            }
          )
      )
    ])

    // Write tracks to chain
    const trackIds = await Promise.all(
      trackMetadatas.map(async (parsedTrackMetadata, i) => {
        // Transform track metadata
        const trackMetadata = this.combineMetadata(
          this.trackUploadHelper.transformTrackUploadMetadata(
            parsedTrackMetadata,
            userId
          ),
          metadata
        )

        const audioResponse = audioResponses[i]

        if (!audioResponse) {
          throw new Error(`Failed to upload track: ${trackMetadata.title}`)
        }

        // Update metadata to include uploaded CIDs
        const updatedMetadata =
          this.trackUploadHelper.populateTrackMetadataWithUploadResponse(
            trackMetadata,
            audioResponse,
            coverArtResponse
          )

        const trackId = await this.trackUploadHelper.generateId('track')
        await this.entityManager.manageEntity({
          userId,
          entityType: EntityType.TRACK,
          entityId: trackId,
          action: Action.CREATE,
          metadata: JSON.stringify({
            cid: '',
            data: snakecaseKeys(updatedMetadata)
          }),
          ...advancedOptions
        })

        return trackId
      })
    )

    const playlistId = await this.trackUploadHelper.generateId('playlist')
    const timestamp = getCurrentTimestamp()

    // Update metadata to include track ids and cover art cid
    const updatedMetadata = {
      ...metadata,
      isPrivate: false,
      playlistContents: trackIds.map((trackId) => ({
        trackId,
        timestamp
      })),
      playlistImageSizesMultihash: coverArtResponse?.orig_file_cid
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
      playlistId: encodeHashId(playlistId)
    }
  }

  /** @internal
   * Method to update a playlist with already parsed inputs
   * This is used for both playlists and albums
   */
  public async updatePlaylistInternal<
    Metadata extends Partial<PlaylistMetadata>
  >(
    {
      userId,
      playlistId,
      imageFile,
      onProgress,
      metadata
    }: z.infer<typeof UpdatePlaylistSchema> & {
      metadata: Metadata
    },
    advancedOptions?: AdvancedOptions
  ) {
    // Upload cover art to storage node
    const coverArtResponse =
      imageFile &&
      (await retry3(
        async () =>
          await this.storage
            .uploadFile({
              file: imageFile,
              onProgress,
              metadata: {
                template: 'img_square'
              }
            })
            .start(),
        (e) => {
          this.logger.info('Retrying uploadPlaylistCoverArt', e)
        }
      ))

    const updatedMetadata = {
      ...metadata,
      ...(coverArtResponse
        ? { playlistImageSizesMultihash: coverArtResponse.orig_file_cid }
        : {})
    }

    return await this.entityManager.manageEntity({
      userId,
      entityType: EntityType.PLAYLIST,
      entityId: playlistId,
      action: Action.UPDATE,
      metadata: JSON.stringify({
        cid: '',
        data: snakecaseKeys(updatedMetadata)
      }),
      ...advancedOptions
    })
  }

  /** @internal
   * Method to create a playlist with already parsed inputs
   * This is used for both playlists and albums
   */
  public async createPlaylistInternal<Metadata extends PlaylistMetadata>(
    {
      userId,
      imageFile,
      metadata,
      onProgress,
      trackIds,
      playlistId: providedPlaylistId
    }: z.infer<typeof CreatePlaylistSchema> & { metadata: Metadata },
    advancedOptions?: AdvancedOptions
  ) {
    // Upload cover art to storage node
    const coverArtResponse =
      imageFile &&
      (await retry3(
        async () =>
          await this.storage
            .uploadFile({
              file: imageFile,
              onProgress,
              metadata: {
                template: 'img_square'
              }
            })
            .start(),
        (e) => {
          this.logger.info('Retrying uploadPlaylistCoverArt', e)
        }
      ))

    const playlistId = providedPlaylistId || (await this.generatePlaylistId())
    const timestamp = getCurrentTimestamp()

    // Update metadata to include track ids
    const updatedMetadata = {
      ...metadata,
      playlistContents: (trackIds ?? []).map((trackId) => ({
        trackId,
        timestamp
      })),
      playlistImageSizesMultihash: coverArtResponse?.orig_file_cid
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
      playlistId: encodeHashId(playlistId)
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
