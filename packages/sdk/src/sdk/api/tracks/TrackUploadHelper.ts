import type { UploadResponse } from '../../services/Storage/types'
import { decodeHashId } from '../../utils/hashId'
import {
  BaseAPI,
  type CreateTrackRequestBody,
  type UpdateTrackRequestBody
} from '../generated/default'
import type { PlaylistTrackMetadata } from '../playlists/types'

export class TrackUploadHelper extends BaseAPI {
  public async generateId(type: 'track' | 'playlist') {
    const response = await this.request({
      path: `/${type}s/unclaimed_id`,
      method: 'GET',
      headers: {},
      query: { noCache: Math.floor(Math.random() * 1000).toString() }
    })

    const { data } = await response.json()
    const id = decodeHashId(data)
    if (id === null) {
      throw new Error(`Could not generate ${type} id`)
    }
    return id
  }

  public transformTrackUploadMetadata(
    inputMetadata: CreateTrackRequestBody | UpdateTrackRequestBody,
    userId: number
  ) {
    const metadata = {
      ...inputMetadata,
      ownerId: userId
    }

    const isStreamGated = metadata.streamConditions !== undefined
    const isUsdcGated = 'usdc_purchase' in (metadata.streamConditions ?? {})
    const isUnlisted = metadata.isUnlisted

    // If track is stream gated and not usdc purchase gated, set remixes to false
    if (isStreamGated && !isUsdcGated && metadata.fieldVisibility) {
      metadata.fieldVisibility.remixes = false
    }

    // If track is public, set required visibility fields to true
    if (!isUnlisted) {
      metadata.fieldVisibility = {
        remixes: true, // default, but overwritten
        ...metadata.fieldVisibility,
        genre: true,
        mood: true,
        tags: true,
        share: true,
        playCount: true
      }
    }
    return metadata
  }

  public populateTrackMetadataWithUploadResponse(
    trackMetadata: CreateTrackRequestBody | UpdateTrackRequestBody,
    audioResponse?: UploadResponse,
    coverArtResponse?: UploadResponse
  ) {
    let updated = {
      ...trackMetadata
    }
    if (audioResponse) {
      updated = {
        ...updated,
        trackCid: audioResponse.results['320'],
        previewCid:
          trackMetadata.previewStartSeconds !== undefined &&
          trackMetadata.previewStartSeconds !== null
            ? audioResponse.results[
                `320_preview|${trackMetadata.previewStartSeconds}`
              ]
            : trackMetadata.previewCid!,
        origFileCid: audioResponse.orig_file_cid,
        origFilename: audioResponse.orig_filename || trackMetadata.origFilename,
        duration: parseInt(audioResponse?.probe?.format?.duration ?? '0', 10),
        bpm: audioResponse.audio_analysis_results?.bpm
          ? audioResponse.audio_analysis_results.bpm
          : trackMetadata.bpm,
        musicalKey: audioResponse.audio_analysis_results?.key
          ? audioResponse.audio_analysis_results.key
          : trackMetadata.musicalKey
      }
    }
    if (coverArtResponse) {
      updated = {
        ...updated,
        coverArtSizes: coverArtResponse.orig_file_cid
      }
    }
    return updated
  }

  public extractMediorumUploadOptions(metadata: PlaylistTrackMetadata) {
    const uploadOptions: { [key: string]: string } = {}
    if (
      metadata.previewStartSeconds !== undefined &&
      metadata.previewStartSeconds !== null
    ) {
      uploadOptions.previewStartSeconds =
        metadata.previewStartSeconds.toString()
    }
    if (metadata.placementHosts) {
      uploadOptions.placement_hosts = metadata.placementHosts
    }
    return uploadOptions
  }
}
