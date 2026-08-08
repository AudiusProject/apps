import { z } from 'zod'

import type { CrossPlatformFile } from '../../types/File'
import type { LoggerService } from '../Logger'
import type { StorageNodeSelectorService } from '../StorageNodeSelector'

/**
 * A handle to control an active upload.
 * Provides methods to interact with the upload without exposing the underlying implementation.
 */
export interface UploadHandle {
  /**
   * Starts the upload
   */
  start: () => Promise<UploadResponse>
  /**
   * Aborts the upload
   */
  abort: (shouldTerminate?: boolean) => void
}

export type StorageServiceConfigInternal = {
  /**
   * Logger service, defaults to console
   */
  logger: LoggerService
}

export type StorageServiceConfig = Partial<StorageServiceConfigInternal> & {
  /**
   * The StorageNodeSelector service used to get the relevant storage node for content
   */
  storageNodeSelector: StorageNodeSelectorService
}

export const ProgressEventSchema = z.object({
  /**
   * Number of bytes loaded so far
   */
  loaded: z.number(),
  /**
   * Total number of bytes to be loaded
   */
  total: z.number(),
  /**
   * Progress of the transcoding process (0-1)
   */
  transcode: z.number()
})

export const ProgressEventHandlerSchema = z
  .function()
  .args(ProgressEventSchema)
  .returns(z.void())

const UploadCreatedHandlerSchema = z
  .function()
  .args(
    z.object({
      abort: z.function().args(z.boolean().optional()).returns(z.void())
    })
  )
  .returns(z.void())

export type UploadCreatedHandler = z.input<typeof UploadCreatedHandlerSchema>

export type ProgressHandler = z.input<typeof ProgressEventHandlerSchema>

export type FileTemplate = 'audio' | 'img_square' | 'img_backdrop'

export type UploadFileParams = {
  file: CrossPlatformFile
  onProgress?: ProgressHandler
  metadata: FileMetadata
}

export type StorageService = {
  uploadFile: (params: UploadFileParams) => UploadHandle
  getUploadStatus: (uploadId: string) => Promise<UploadResponse>
  generatePreview: ({
    cid,
    secondOffset,
    userId
  }: {
    cid: string
    secondOffset: number
    userId: number
  }) => Promise<string>
}

export type ProcessingStatus =
  | 'new'
  | 'error'
  | 'busy'
  | 'timeout'
  | 'audio_analysis'
  | 'busy_audio_analysis'
  | 'done'

export type UploadResponse = {
  id: string
  status: ProcessingStatus
  results: {
    [key: string]: string
  }
  orig_file_cid: string
  orig_filename: string
  audio_analysis_error_count: number
  audio_analysis_results?: {
    bpm?: number
    key?: string
  } | null
  probe?: {
    format?: {
      duration?: string
    }
  }
  transcode_progress?: number
}

export type FileMetadata = {
  filename?: string
  filetype?: string
  template: 'audio' | 'img_square' | 'img_backdrop'
  userWallet?: string
  previewStartSeconds?: number
  placementHosts?: string
  /**
   * Decoded id of the user the upload is made for. Sent on audio uploads so
   * the validator can attest on chain that these bytes were uploaded for that
   * user, which is what makes the resulting cids claimable on a track. It is
   * an assertion, not proof of identity — ownership is enforced when the cid
   * is named on a track, in a signed entity-manager write.
   *
   * Image uploads leave this unset: signup uploads a profile picture before
   * the account has a user id, and images are served unauthenticated anyway,
   * so there is no claim to protect.
   */
  userId?: number
}
