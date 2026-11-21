import { ProgressCB } from '../services/creatorNode'
import {
  Action,
  EntityManagerClient
} from '../services/dataContracts/EntityManagerClient'
import { Nullable, TrackMetadata, UploadTrackMetadata, Utils } from '../utils'

import type { BaseConstructorArgs } from './base'
import { Base, Services } from './base'

const TRACK_PROPS = [
  'owner_id',
  'title',
  'cover_art_sizes',
  'tags',
  'genre',
  'mood',
  'credits_splits',
  'release_date',
  'file_type',
  'is_stream_gated',
  'stream_conditions',
  'is_download_gated',
  'download_conditions',
  'is_original_available',
  'is_downloadable',
  'ai_attribution_user_id',
  'allowed_api_keys'
]
const TRACK_REQUIRED_PROPS = ['owner_id', 'title']

const { decodeHashId } = Utils

export class Track extends Base {
  constructor(...args: BaseConstructorArgs) {
    super(...args)
    this.getTracks = this.getTracks.bind(this)
    this.getTracksIncludingUnlisted = this.getTracksIncludingUnlisted.bind(this)
    this.getRandomTracks = this.getRandomTracks.bind(this)
    this.getStemsForTrack = this.getStemsForTrack.bind(this)
    this.getRemixesOfTrack = this.getRemixesOfTrack.bind(this)
    this.getRemixTrackParents = this.getRemixTrackParents.bind(this)
    this.getLibraryTracks = this.getLibraryTracks.bind(this)
    this.getTrendingTracks = this.getTrendingTracks.bind(this)
    this.getTrackListens = this.getTrackListens.bind(this)
    this.getSaversForTrack = this.getSaversForTrack.bind(this)
    this.getSaversForPlaylist = this.getSaversForPlaylist.bind(this)
    this.getRepostersForTrack = this.getRepostersForTrack.bind(this)
    this.getRepostersForPlaylist = this.getRepostersForPlaylist.bind(this)
    this.logTrackListen = this.logTrackListen.bind(this)
    this.deleteTrack = this.deleteTrack.bind(this)
  }

  async getTracks(
    limit = 100,
    offset = 0,
    idsArray: Nullable<string[]> = null,
    targetUserId: Nullable<string> = null,
    sort: Nullable<boolean> = null,
    minBlockNumber: Nullable<number> = null,
    filterDeleted: Nullable<boolean> = null,
    withUsers = false
  ) {
    this.REQUIRES(Services.DISCOVERY_PROVIDER)
    return await this.discoveryProvider.getTracks(
      limit,
      offset,
      idsArray,
      targetUserId,
      sort,
      minBlockNumber,
      filterDeleted,
      withUsers
    )
  }

  async getTracksVerbose(
    limit = 100,
    offset = 0,
    idsArray: Nullable<string[]> = null,
    targetUserId: Nullable<string> = null,
    sort: Nullable<boolean> = null,
    minBlockNumber: Nullable<number> = null,
    filterDeleted: Nullable<boolean> = null,
    withUsers = false
  ) {
    this.REQUIRES(Services.DISCOVERY_PROVIDER)
    return await this.discoveryProvider.getTracksVerbose(
      limit,
      offset,
      idsArray,
      targetUserId,
      sort,
      minBlockNumber,
      filterDeleted,
      withUsers
    )
  }

  async getTracksByHandleAndSlug(handle: string, slug: string) {
    this.REQUIRES(Services.DISCOVERY_PROVIDER)
    return await this.discoveryProvider.getTracksByHandleAndSlug(handle, slug)
  }

  async getTracksIncludingUnlisted(identifiers: string[], withUsers = false) {
    this.REQUIRES(Services.DISCOVERY_PROVIDER)
    return await this.discoveryProvider.getTracksIncludingUnlisted(
      identifiers,
      withUsers
    )
  }

  async getRandomTracks(
    genre: string,
    limit: number,
    exclusionList: number[],
    time: string
  ) {
    this.REQUIRES(Services.DISCOVERY_PROVIDER)
    return await this.discoveryProvider.getRandomTracks(
      genre,
      limit,
      exclusionList,
      time
    )
  }

  async getStemsForTrack(trackId: number) {
    this.REQUIRES(Services.DISCOVERY_PROVIDER)
    return await this.discoveryProvider.getStemsForTrack(trackId)
  }

  async getRemixesOfTrack(
    trackId: number,
    limit: Nullable<number> = null,
    offset: Nullable<number> = null
  ) {
    this.REQUIRES(Services.DISCOVERY_PROVIDER)
    return await this.discoveryProvider.getRemixesOfTrack(
      trackId,
      limit,
      offset
    )
  }

  async getRemixTrackParents(
    trackId: number,
    limit: Nullable<number> = null,
    offset: Nullable<number> = null
  ) {
    this.REQUIRES(Services.DISCOVERY_PROVIDER)
    return await this.discoveryProvider.getRemixTrackParents(
      trackId,
      limit,
      offset
    )
  }

  async getLibraryTracks(limit = 100, offset = 0, withUsers = false) {
    this.REQUIRES(Services.DISCOVERY_PROVIDER)
    return await this.discoveryProvider.getLibraryTracks(
      limit,
      offset,
      withUsers
    )
  }

  async getTrendingTracks(
    genre: Nullable<string> = null,
    time: Nullable<string> = null,
    idsArray: Nullable<number[]> = null,
    limit: Nullable<number> = null,
    offset: Nullable<number> = null
  ) {
    this.REQUIRES(Services.IDENTITY_SERVICE)
    return await this.discoveryProvider.getTrendingTracks(
      genre,
      time,
      idsArray,
      limit,
      offset
    )
  }

  async getTrackListens(
    timeFrame = null,
    idsArray = null,
    startTime = null,
    endTime = null,
    limit = null,
    offset = null
  ) {
    this.REQUIRES(Services.IDENTITY_SERVICE)
    return await this.identityService.getTrackListens(
      timeFrame,
      idsArray,
      startTime,
      endTime,
      limit,
      offset
    )
  }

  async getSaversForTrack(limit = 100, offset = 0, saveTrackId: number) {
    this.REQUIRES(Services.DISCOVERY_PROVIDER)
    return await this.discoveryProvider.getSaversForTrack(
      limit,
      offset,
      saveTrackId
    )
  }

  async getSaversForPlaylist(limit = 100, offset = 0, savePlaylistId: number) {
    this.REQUIRES(Services.DISCOVERY_PROVIDER)
    return await this.discoveryProvider.getSaversForPlaylist(
      limit,
      offset,
      savePlaylistId
    )
  }

  async getRepostersForTrack(limit = 100, offset = 0, repostTrackId: number) {
    this.REQUIRES(Services.DISCOVERY_PROVIDER)
    return await this.discoveryProvider.getRepostersForTrack(
      limit,
      offset,
      repostTrackId
    )
  }

  async getRepostersForPlaylist(
    limit = 100,
    offset = 0,
    repostPlaylistId: number
  ) {
    this.REQUIRES(Services.DISCOVERY_PROVIDER)
    return await this.discoveryProvider.getRepostersForPlaylist(
      limit,
      offset,
      repostPlaylistId
    )
  }

  async uploadTrackV2AndWriteToChain(
    userId: number,
    trackFile: File,
    coverArtFile: File,
    metadata: UploadTrackMetadata,
    onProgress: () => void,
    trackId?: number
  ) {
    const updatedMetadata = await this.uploadTrackV2(
      userId,
      trackFile,
      coverArtFile,
      metadata,
      onProgress
    )
    const {
      trackId: updatedTrackId,
      metadataCid,
      txReceipt
    } = await this.writeTrackToChain(
      userId,
      updatedMetadata,
      Action.CREATE,
      trackId
    )
    return { trackId: updatedTrackId, metadataCid, updatedMetadata, txReceipt }
  }

  async uploadTrackV2(
    userId: number,
    trackFile: File,
    coverArtFile: File | null,
    metadata: UploadTrackMetadata,
    onProgress: ProgressCB
  ) {
    this.REQUIRES(Services.CREATOR_NODE)
    this.FILE_IS_VALID(trackFile)
    if (coverArtFile) this.FILE_IS_VALID(coverArtFile)
    this.IS_OBJECT(metadata)
    if (!userId) {
      throw new Error('userId cannot be empty')
    }

    metadata.owner_id = userId
    this._validateTrackMetadata(metadata)

    const updatedMetadata =
      await this.creatorNode.uploadTrackAudioAndCoverArtV2(
        trackFile,
        coverArtFile,
        metadata,
        onProgress
      )
    return updatedMetadata
  }

  async addTracksToChainV2(trackMetadatas: TrackMetadata[], userId: number) {
    let requestFailed = false
    const trackIds = (
      await Promise.all(
        trackMetadatas.map(async (trackMetadata) => {
          try {
            const { trackId } = await this.writeTrackToChain(
              userId,
              trackMetadata,
              Action.CREATE
            )
            return trackId
          } catch (e) {
            requestFailed = true
            console.error(`Failed to add track to chain: ${e}`)
            return null
          }
        })
      )
    ).filter(Boolean)

    const error = requestFailed || trackIds.length !== trackMetadatas.length
    return { error, trackIds }
  }

  async writeTrackToChain(
    userId: number,
    trackMetadata: TrackMetadata,
    action: Action,
    trackId?: number
  ) {
    if (!trackId) trackId = await this.generateTrackId()
    const parsedTrackMetadata = Track._parseTrackMetadata(trackMetadata)
    const metadataCid =
      await Utils.fileHasher.generateMetadataCidV1(parsedTrackMetadata)
    const { txReceipt } =
      await this.contracts.EntityManagerClient!.manageEntity(
        userId,
        EntityManagerClient.EntityType.TRACK,
        trackId,
        action,
        JSON.stringify({
          cid: metadataCid.toString(),
          data: parsedTrackMetadata
        })
      )
    return { trackId, metadataCid, txReceipt }
  }

  async updateTrackV2(
    userId: number,
    metadata: TrackMetadata,
    transcodePreview = false
  ) {
    this.IS_OBJECT(metadata)

    metadata.owner_id = userId
    this._validateTrackMetadata(metadata)

    const trackId = metadata.track_id
    let updatedMetadata = { ...metadata }

    if (transcodePreview) {
      if (metadata.preview_start_seconds == null) {
        throw new Error('No track preview start time specified')
      }
      if (!metadata.audio_upload_id) {
        throw new Error('Missing required audio_upload_id')
      }

      updatedMetadata = await this.creatorNode.transcodeTrackPreview(metadata)
    }

    const { txReceipt } = await this.writeTrackToChain(
      userId,
      updatedMetadata,
      Action.UPDATE,
      trackId
    )

    return {
      blockHash: txReceipt.blockHash,
      blockNumber: txReceipt.blockNumber,
      trackId,
      updatedMetadata
    }
  }

  async logTrackListen(
    trackId: number,
    unauthUuid: number,
    userId?: number,
    solanaListen = false
  ) {
    this.REQUIRES(Services.IDENTITY_SERVICE)

    return await this.identityService.logTrackListen(
      trackId,
      userId ?? unauthUuid,
      null,
      null,
      solanaListen
    )
  }

  async deleteTrack(userId: number, trackId: number) {
    return await this.contracts.EntityManagerClient!.manageEntity(
      userId,
      EntityManagerClient.EntityType.TRACK,
      trackId,
      EntityManagerClient.Action.DELETE,
      ''
    )
  }

  async generateTrackId(): Promise<number> {
    const encodedId = await this.discoveryProvider.getUnclaimedId('tracks')
    if (!encodedId) {
      throw new Error('No unclaimed track IDs')
    }
    return decodeHashId(encodedId)!
  }

  _validateTrackMetadata(metadata: Partial<TrackMetadata>) {
    this.OBJECT_HAS_PROPS(metadata, TRACK_PROPS, TRACK_REQUIRED_PROPS)
    this.creatorNode.validateTrackSchema(metadata)
  }

  static _parseTrackMetadata(trackMetadata: TrackMetadata): TrackMetadata {
    const {
      blocknumber,
      is_delete,
      track_id,
      is_downloadable,
      is_original_available,
      created_at,
      isrc,
      iswc,
      credits_splits,
      description,
      genre,
      has_current_user_reposted,
      has_current_user_saved,
      license,
      mood,
      play_count,
      owner_id,
      release_date,
      repost_count,
      save_count,
      tags,
      title,
      track_segments,
      cover_art,
      cover_art_sizes,
      is_unlisted,
      is_scheduled_release,
      is_available,
      is_owned_by_user,
      is_stream_gated,
      stream_conditions,
      is_download_gated,
      download_conditions,
      permalink,
      preview_start_seconds,
      duration,
      is_invalid,
      stem_of,
      ddex_app,
      is_playlist_upload,
      audio_upload_id,
      track_cid,
      orig_file_cid,
      orig_filename,
      preview_cid,
      dateListened,
      remix_of,
      ai_attribution_user_id,
      allowed_api_keys,
      bpm,
      is_custom_bpm,
      musical_key,
      is_custom_musical_key,
      audio_analysis_error_count,
      comments_disabled,
      comment_count,
      field_visibility,
      cover_original_song_title,
      cover_original_artist,
      ...other
    } = trackMetadata
    if (typeof other !== 'undefined') {
      console.warn('Unknown keys in upload metadata:', Object.keys(other))
    }
    return {
      blocknumber,
      is_delete,
      track_id,
      is_downloadable,
      is_original_available,
      created_at,
      isrc,
      iswc,
      credits_splits,
      description,
      genre,
      has_current_user_reposted,
      has_current_user_saved,
      license,
      mood,
      play_count,
      owner_id,
      release_date,
      repost_count,
      save_count,
      tags,
      title,
      track_segments,
      cover_art,
      cover_art_sizes,
      is_unlisted,
      is_scheduled_release,
      is_available,
      is_owned_by_user,
      is_stream_gated,
      stream_conditions,
      is_download_gated,
      download_conditions,
      permalink,
      preview_start_seconds,
      duration,
      is_invalid,
      stem_of,
      ddex_app,
      is_playlist_upload,
      audio_upload_id,
      track_cid,
      orig_file_cid,
      orig_filename,
      preview_cid,
      dateListened,
      remix_of,
      ai_attribution_user_id,
      allowed_api_keys,
      bpm,
      is_custom_bpm,
      musical_key,
      is_custom_musical_key,
      audio_analysis_error_count,
      comments_disabled,
      comment_count,
      field_visibility,
      cover_original_song_title,
      cover_original_artist
    }
  }
}
