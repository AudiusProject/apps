import { useCallback } from 'react'

import type { UploadTrackFilesTask } from '@audius/sdk'

import { uploadActions, ProgressStatus } from '~/store'

import { useQueryContext } from '../utils'

type UploadTrackFilesTaskWithClientId = UploadTrackFilesTask & {
  clientId: string
  key: 'audio' | 'image'
}

export const useUploadFiles = () => {
  const { dispatch } = useQueryContext()
  const uploadFiles = useCallback(
    async (tasks: UploadTrackFilesTaskWithClientId[]) => {
      return await Promise.all(
        tasks.map(async (u) => {
          try {
            const res = await u.start()
            return { ...res, clientId: u.clientId }
          } catch (e) {
            dispatch(
              uploadActions.updateProgress({
                clientId: u.clientId,
                key: u.key,
                stemIndex: null,
                progress: { status: ProgressStatus.ERROR }
              })
            )
            console.error('Upload: Upload Track File', e as Error)
            return {
              clientId: u.clientId,
              audioUploadResponse: null,
              imageUploadResponse: null,
              error: e as Error
            }
          }
        })
      )
    },
    [dispatch]
  )
  return uploadFiles
}
