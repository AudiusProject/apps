import * as tus from 'tus-js-client'

import { productionConfig } from '../../config/production'
import fetch from '../../utils/fetch'
import { mergeConfigWithDefaults } from '../../utils/mergeConfigs'
import { wait } from '../../utils/wait'
import type { LoggerService } from '../Logger'
import type { StorageNodeSelectorService } from '../StorageNodeSelector'

import { getDefaultStorageServiceConfig } from './getDefaultConfig'
import type {
  FileTemplate,
  ProgressHandler,
  StorageService,
  StorageServiceConfig,
  StorageServiceConfigInternal,
  UploadResponse,
  UploadFileParams
} from './types'

const MAX_TRACK_TRANSCODE_TIMEOUT = 3600000 // 1 hour
const MAX_TRACK_TRANSCODE_NO_PROGRESS_TIMEOUT = 600000 // 10 minutes
const MAX_IMAGE_RESIZE_TIMEOUT_MS = 300000 // 5 minutes
const POLL_STATUS_INTERVAL = 3000 // 3s

export class Storage implements StorageService {
  /**
   * Configuration passed in by consumer (with defaults)
   */
  private readonly config: StorageServiceConfigInternal
  private readonly storageNodeSelector: StorageNodeSelectorService
  private readonly logger: LoggerService

  constructor(config: StorageServiceConfig) {
    this.config = mergeConfigWithDefaults(
      config,
      getDefaultStorageServiceConfig(productionConfig)
    )
    this.storageNodeSelector = config.storageNodeSelector
    this.logger = this.config.logger.createPrefixedLogger('[storage]')
  }

  /**
   * Upload a file to a validator
   */
  uploadFile({ file, onProgress, metadata }: UploadFileParams) {
    const ac = new AbortController()
    let upload: tus.Upload | undefined
    let uploadPromise: Promise<UploadResponse> | undefined
    let cachedTotal = 0

    return {
      start: async () => {
        if (uploadPromise) {
          return uploadPromise
        }
        uploadPromise = new Promise<UploadResponse>((resolve, reject) => {
          this.storageNodeSelector
            .getSelectedNode()
            .then((selectedNode) => {
              if (!selectedNode) {
                reject(new Error('No node available'))
                return
              }
              upload = new tus.Upload(file as File, {
                endpoint: `${selectedNode}/files/`,
                retryDelays: [0, 3000, 5000, 10000, 20000],
                chunkSize: 100_000_000, // 100MB
                removeFingerprintOnSuccess: true,
                metadata: {
                  filename: metadata.filename || file.name || 'file',
                  filetype:
                    metadata.filetype ||
                    file.type ||
                    'application/octet-stream',
                  template: metadata.template,
                  ...(metadata.placementHosts
                    ? { placementHosts: metadata.placementHosts }
                    : {}),
                  ...(metadata.previewStartSeconds !== undefined
                    ? {
                        previewStartSeconds:
                          metadata.previewStartSeconds.toString()
                      }
                    : {})
                },
                onError: reject,
                onProgress: (loaded: number, total: number) => {
                  cachedTotal = total
                  onProgress?.({
                    loaded,
                    total,
                    transcode: 0
                  })
                },
                onSuccess: async () => {
                  const uploadId = upload?.url?.split('/').pop()
                  if (!uploadId) {
                    reject(new Error('No upload ID received'))
                    return
                  }
                  const res = await this.pollProcessingStatus(
                    uploadId,
                    metadata.template,
                    cachedTotal,
                    onProgress,
                    ac.signal
                  )
                  resolve(res)
                }
              })

              upload
                ?.findPreviousUploads()
                .then((previousUpload) => {
                  if (previousUpload?.length && previousUpload[0]) {
                    upload?.resumeFromPreviousUpload(previousUpload[0])
                  }
                  upload?.start()
                })
                .catch(reject)
            })
            .catch(reject)
        })
        return uploadPromise
      },
      abort: (shouldTerminate = false) => {
        upload?.abort(shouldTerminate)
        ac.abort()
      }
    }
  }

  async getUploadStatus(uploadId: string): Promise<UploadResponse> {
    const selectedNode = await this.storageNodeSelector.getSelectedNode()
    if (!selectedNode) {
      throw new Error('No node available')
    }

    const response = await fetch(`${selectedNode}/uploads/${uploadId}`)
    if (!response.ok) {
      throw new Error(
        `Failed to get upload status for uploadId ${uploadId}, status: ${response.status}`
      )
    }
    return await response.json()
  }

  /**
   * Generates a preview for a track at the given second offset
   * @param {Object} params
   * @param {string} params.cid - The CID of the track to generate a preview for
   * @param {number} params.secondOffset - The offset in seconds to start the preview from
   * @returns {Promise<string>} The CID of the generated preview
   */
  async generatePreview({
    cid,
    secondOffset
  }: {
    cid: string
    secondOffset: number
  }) {
    const contentNodeEndpoint = await this.storageNodeSelector.getSelectedNode()

    if (!contentNodeEndpoint) {
      throw new Error('No content node available')
    }

    const response = await fetch(
      `${contentNodeEndpoint}/generate_preview/${cid}/${secondOffset}`,
      {
        method: 'POST'
      }
    )
    if (!response.ok) {
      throw new Error(
        `Failed to generate preview for cid ${cid} at offset ${secondOffset}, status: ${response.status}`
      )
    }

    const data = await response.json()
    return data.cid
  }

  /**
   * Works for both track transcode and image resize jobs
   * @param id ID of the transcode/resize job
   * @param maxPollingMs millis to stop polling and error if job is not done
   * @returns successful job info, or throws error if job fails / times out
   */
  private async pollProcessingStatus(
    id: string,
    template: FileTemplate,
    total: number,
    onProgress?: ProgressHandler,
    abortSignal?: AbortSignal
  ) {
    const start = Date.now()
    let lastProgressUpdate = Date.now()
    let lastTranscodeProgress = 0

    const maxPollingMs =
      template === 'audio'
        ? MAX_TRACK_TRANSCODE_TIMEOUT
        : MAX_IMAGE_RESIZE_TIMEOUT_MS

    while (Date.now() - start < maxPollingMs) {
      try {
        if (abortSignal?.aborted) {
          throw new Error('Upload aborted')
        }
        const resp = await this.getProcessingStatus(id)
        if (template === 'audio' && resp.transcode_progress) {
          // Only update lastProgressUpdate if the progress has increased
          if (resp.transcode_progress > lastTranscodeProgress) {
            lastProgressUpdate = Date.now()
            lastTranscodeProgress = resp.transcode_progress
          } else if (
            Date.now() - lastProgressUpdate >
            MAX_TRACK_TRANSCODE_NO_PROGRESS_TIMEOUT
          ) {
            throw new Error(
              `No transcoding progress increase for ${MAX_TRACK_TRANSCODE_NO_PROGRESS_TIMEOUT}ms. Progress stuck at ${lastTranscodeProgress}. id=${id}`
            )
          }
          onProgress?.({
            loaded: total,
            total,
            transcode: resp.transcode_progress
          })
        }
        if (resp?.status === 'done') {
          return resp
        }
        if (resp?.status === 'error') {
          throw new Error(
            `Upload failed: id=${id}, resp=${JSON.stringify(resp)}`
          )
        }
      } catch (e: any) {
        // Rethrow if error is "Upload failed", stalled, or if status code is 422 (Unprocessable Entity)
        if (
          e.message?.startsWith('Upload failed') ||
          e.message?.startsWith('No transcoding progress increase') ||
          (e.response && e.response?.status === 422)
        ) {
          throw e
        }

        // Swallow errors caused by failure to establish connection to node so we can retry polling
        this.logger.error(`Failed to poll for processing status, ${e}`)
      }

      await wait(POLL_STATUS_INTERVAL)
    }

    throw new Error(`Upload took over ${maxPollingMs}ms. id=${id}`)
  }

  /**
   * Gets the task progress given the task type and id associated with the job
   * @param id the id of the transcoding or resizing job
   * @returns the status, and the success or failed response if the job is complete
   */
  private async getProcessingStatus(id: string): Promise<UploadResponse> {
    let lastErr
    for (
      let selectedNode = await this.storageNodeSelector.getSelectedNode();
      !this.storageNodeSelector.triedSelectingAllNodes();
      selectedNode = await this.storageNodeSelector.getSelectedNode(true)
    ) {
      try {
        const response = await fetch(`${selectedNode}/uploads/${id}`)
        if (response.ok) {
          return await response.json()
        } else {
          lastErr = `HTTP error: ${response.status} ${
            response.statusText
          }, ${await response.text()}`
        }
      } catch (e: any) {
        lastErr = e
      }
    }

    const msg = `Error sending storagev2 uploads polling request, tried all healthy storage nodes. Last error: ${lastErr}`
    this.logger.error(msg)
    throw new Error(msg)
  }
}
