import type { CrossPlatformFile, FileMetadata, UploadHandle } from '@audius/sdk'
import {
  mutationOptions,
  useMutation,
  type MutationFunctionContext
} from '@tanstack/react-query'

import { ProgressStatus, uploadActions } from '~/store'

import { useQueryContext, type QueryContextType } from '../utils'

import { getUploadStatusOptions } from './useUploadStatus'

const { updateProgress, resetProgress } = uploadActions

type UploadFilesParams = {
  files: {
    clientId: string
    stemIndex?: number | null
    file: CrossPlatformFile
    metadata: FileMetadata
  }[]
  onUploadCreated?: (clientId: string, upload: UploadHandle) => void
}

type UploadFileContext = Pick<QueryContextType, 'audiusSdk' | 'dispatch'>

const pollFileUploadStatus = async (
  context: UploadFileContext,
  queryContext: MutationFunctionContext,
  clientId: string,
  stemIndex: number | null | undefined,
  type: 'audio' | 'art',
  uploadId: string,
  abortSignal?: AbortSignal,
  timeoutS: number = 3600, // 1 hour
  delayMs: number = 3000 // 3 seconds
) => {
  const t = setTimeout(() => {
    context.dispatch(
      updateProgress({
        clientId,
        stemIndex: stemIndex ?? null,
        key: type,
        progress: { status: ProgressStatus.ERROR }
      })
    )
    throw new Error('Upload timed out')
  }, timeoutS * 1000)

  while (true) {
    if (abortSignal?.aborted) {
      clearTimeout(t)
      throw new Error('Upload aborted')
    }

    await new Promise((resolve) => setTimeout(resolve, delayMs))
    try {
      await queryContext.client.invalidateQueries({
        queryKey: getUploadStatusOptions(context, { uploadId }).queryKey,
        refetchType: 'all'
      })
      const res = await queryContext.client.fetchQuery(
        getUploadStatusOptions(context, { uploadId })
      )
      context.dispatch(
        updateProgress({
          clientId,
          stemIndex: stemIndex ?? null,
          key: type,
          progress: {
            status: ProgressStatus.PROCESSING,
            transcode: res.transcode_progress
          }
        })
      )
      if (
        res.status === 'done' ||
        res.status === 'error' ||
        res.status === 'timeout'
      ) {
        if (res.status === 'timeout') {
          throw new Error('Upload timed out')
        }
        if (res.status === 'error') {
          throw new Error('Upload failed')
        }
        context.dispatch(
          updateProgress({
            clientId,
            stemIndex: stemIndex ?? null,
            key: type,
            progress: { status: ProgressStatus.COMPLETE }
          })
        )
        clearTimeout(t)
        return res
      }
    } catch (err) {
      // continue polling on error
      console.error('Error polling upload status', err)
    }
  }
}

const getUploadFilesOptions = (context: UploadFileContext) => {
  return mutationOptions({
    mutationFn: async (params: UploadFilesParams, queryContext) => {
      const sdk = await context.audiusSdk()

      return await Promise.all(
        params.files.map(async (fileObj) => {
          const abortController = new AbortController()

          // Always start progress from zero. Useful when the audio file gets replaced
          context.dispatch(
            resetProgress({
              clientId: fileObj.clientId,
              stemIndex: fileObj.stemIndex ?? null,
              key: fileObj.metadata.template === 'audio' ? 'audio' : 'art'
            })
          )

          const uploadId = await sdk.services.storage.uploadFileV2({
            file: fileObj.file,
            onProgress: (loaded, total) =>
              context.dispatch(
                updateProgress({
                  clientId: fileObj.clientId,
                  stemIndex: fileObj.stemIndex ?? null,
                  key: fileObj.metadata.template === 'audio' ? 'audio' : 'art',
                  progress: {
                    status: ProgressStatus.UPLOADING,
                    loaded,
                    total
                  }
                })
              ),
            metadata: fileObj.metadata,
            onUploadCreated: (upload) => {
              params.onUploadCreated?.(fileObj.clientId, {
                abort: () => {
                  upload.abort()
                  abortController.abort()
                }
              })
            }
          })

          const transcodeRes = await pollFileUploadStatus(
            context,
            queryContext,
            fileObj.clientId,
            fileObj.stemIndex,
            fileObj.metadata.template === 'audio' ? 'audio' : 'art',
            uploadId,
            abortController.signal
          )
          return { response: transcodeRes, clientId: fileObj.clientId }
        })
      )
    }
  })
}

type UseUploadFilesOptions = ReturnType<typeof getUploadFilesOptions>

export const useUploadFiles = (options?: UseUploadFilesOptions) => {
  const context = useQueryContext()
  const { dispatch } = context

  return useMutation({
    ...options,
    ...getUploadFilesOptions({ ...context, dispatch })
  })
}
