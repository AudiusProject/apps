import { type ProgressHandler } from '../../services'
import type { CrossPlatformFile } from '../../types/File'

import type { UploadsApiServicesConfig } from './types'

export class UploadsApi {
  private readonly storage

  constructor(services: UploadsApiServicesConfig) {
    this.storage = services.storageService
  }

  /**
   * Creates an audio file upload task that uploads to a validator and returns
   * the resulting CIDs and analysis metadata.
   *
   * Optionally accepts a callback for tracking upload progress, a list of
   * placement hosts to prefer for storage, and a start time in seconds
   * for generating a preview clip.
   */
  public createAudioUpload({
    file,
    onProgress,
    previewStartSeconds,
    placementHosts
  }: {
    file: CrossPlatformFile
    onProgress?: ProgressHandler
    placementHosts?: string[]
    previewStartSeconds?: number
  }) {
    const upload = this.storage.uploadFile({
      file,
      onProgress,
      metadata: {
        template: 'audio',
        filename: file.name ?? undefined,
        filetype: file.type ?? undefined,
        previewStartSeconds,
        placementHosts: placementHosts?.join(',')
      }
    })
    return {
      abort: upload.abort,
      start: () =>
        upload.start().then((res) => ({
          trackCid: res.results['320'],
          previewCid:
            previewStartSeconds !== undefined && previewStartSeconds !== null
              ? res.results[`320_preview|${previewStartSeconds}`]
              : undefined,
          origFileCid: res.orig_file_cid,
          origFilename: res.orig_filename,
          duration: parseInt(res?.probe?.format?.duration ?? '0', 10),
          bpm: res.audio_analysis_results?.bpm,
          musicalKey: res.audio_analysis_results?.key
        }))
    }
  }

  /**
   * Creates an image upload task that uploads to a validator and returns the
   * resulting CID.
   *
   * Optionally accepts a callback for tracking upload progress, a list of
   * placement hosts to prefer for storage, and a boolean indicating whether
   * the image is a backdrop (as opposed to square, e.g. for profile banners).
   */
  public createImageUpload({
    file,
    onProgress,
    isBackdrop = false,
    placementHosts
  }: {
    file: CrossPlatformFile
    onProgress?: ProgressHandler
    isBackdrop?: boolean
    placementHosts?: string[]
  }) {
    const upload = this.storage.uploadFile({
      file,
      onProgress,
      metadata: {
        template: isBackdrop ? 'img_backdrop' : 'img_square',
        filename: file.name ?? undefined,
        filetype: file.type ?? undefined,
        placementHosts: placementHosts?.join(',')
      }
    })
    return {
      abort: upload.abort,
      start: () => upload.start().then((res) => res.orig_file_cid)
    }
  }
}
