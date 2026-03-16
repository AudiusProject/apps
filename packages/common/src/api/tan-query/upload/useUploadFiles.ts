import { useCallback } from 'react'

import type { UploadTrackFilesTask } from '@audius/sdk/services'

import { Feature } from '~/models'
import { uploadActions, ProgressStatus } from '~/store'

import { useQueryContext } from '../utils'

type UploadTrackFilesTaskWithClientId = UploadTrackFilesTask & {
  clientId: string
  key: 'audio' | 'image'
}

export const useUploadFiles = () => {
  const { dispatch, reportToSentry } = useQueryContext()
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
            reportToSentry({
              error: e as Error,
              name: 'Upload: Upload Track File',
              feature: Feature.Upload
            })
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
    [dispatch, reportToSentry]
  )
  return uploadFiles
}
