import type { FileMetadata } from '@audius/sdk'
import {
  mutationOptions,
  useMutation,
  type MutationFunctionContext
} from '@tanstack/react-query'

import { ProgressStatus, type Progress } from '~/store'

import { useQueryContext, type QueryContextType } from '../utils'

import { getUploadStatusOptions } from './useUploadStatus'

type UploadFilesParams = {
  files: {
    clientId: string
    file: File
    metadata: FileMetadata
    onProgress: (clientId: string, progress: Progress) => void
  }[]
}

type UploadFileContext = Pick<QueryContextType, 'audiusSdk'>

const pollFileUploadStatus = async (
  context: UploadFileContext,
  queryContext: MutationFunctionContext,
  clientId: string,
  onProgress: (clientId: string, progress: Progress) => void,
  uploadId: string,
  timeoutS: number = 3600, // 1 hour
  delayMs: number = 3000 // 3 seconds
) => {
  const t = setTimeout(() => {
    onProgress(clientId, { status: ProgressStatus.ERROR })
    throw new Error('Upload timed out')
  }, timeoutS * 1000)

  while (true) {
    await new Promise((resolve) => setTimeout(resolve, delayMs))
    try {
      await queryContext.client.invalidateQueries({
        queryKey: getUploadStatusOptions(context, { uploadId }).queryKey,
        refetchType: 'all'
      })
      const res = await queryContext.client.fetchQuery(
        getUploadStatusOptions(context, { uploadId })
      )
      onProgress(clientId, {
        status: ProgressStatus.PROCESSING,
        transcode: res.transcode_progress
      })
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
        onProgress(clientId, { status: ProgressStatus.COMPLETE })
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
          const uploadId = await sdk.services.storage.uploadFileV2({
            file: fileObj.file,
            onProgress: (loaded, total) =>
              fileObj.onProgress(fileObj.clientId, {
                status: ProgressStatus.UPLOADING,
                loaded,
                total
              }),
            metadata: fileObj.metadata
          })
          const res = await pollFileUploadStatus(
            context,
            queryContext,
            fileObj.clientId,
            fileObj.onProgress,
            uploadId
          )
          return { response: res, clientId: fileObj.clientId }
        })
      )
    }
  })
}

type UseUploadFilesOptions = ReturnType<typeof getUploadFilesOptions>

export const useUploadFiles = (options?: UseUploadFilesOptions) => {
  const context = useQueryContext()

  return useMutation({
    ...options,
    ...getUploadFilesOptions(context)
  })
}
