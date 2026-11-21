import { useCallback } from 'react'

import { useDownloadTrackStems } from '@audius/common/api'
import { ID } from '@audius/common/models'

const triggerDownload = (url: string) => {
  const link = document.createElement('a')
  link.href = url
  link.click()
  link.remove()
}

export const useDownloadTrackStemsZip = (trackId: ID) => {
  const { mutateAsync: getStemsZipUrl } = useDownloadTrackStems({ trackId })

  return useCallback(async () => {
    try {
      triggerDownload(await getStemsZipUrl())
    } catch (e) {
      console.error('Failed to start stems download', e)
    }
  }, [getStemsZipUrl])
}
