import type { CrossPlatformFile } from '../../types/File'
import type { LoggerService } from '../Logger'
import type { StorageNodeSelectorService } from '../StorageNodeSelector'

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

export type ProgressHandler = (
  progress:
    | {
        art: {
          upload?: { loaded: number; total: number }
          transcode?: { decimal: number }
          resize?: undefined
        }
      }
    | {
        audio: {
          upload?: { loaded: number; total: number }
          transcode?: { decimal: number }
          resize?: undefined
        }
      }
) => void

export type FileTemplate = 'audio' | 'img_square' | 'img_backdrop'

export type StorageService = {
  uploadFile: ({
    file,
    onProgress,
    template,
    options
  }: {
    file: CrossPlatformFile
    onProgress?: ProgressHandler
    template: FileTemplate
    options?: { [key: string]: string }
  }) => Promise<UploadResponse>
  uploadFileV2: ({
    file,
    onProgress,
    metadata
  }: {
    file: File
    onProgress: (loadedBytes: number, totalBytes: number) => void
    metadata: FileMetadata
  }) => Promise<string>
  getUploadStatus: (uploadId: string) => Promise<UploadResponse>
  generatePreview: ({
    cid,
    secondOffset
  }: {
    cid: string
    secondOffset: number
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
  previewStartSeconds?: string
  placementHosts?: string
}
