import { useCallback } from 'react'

import { useDownloadTrackStems } from '@audius/common/api'
import { ID } from '@audius/common/models'

// The response is an attachment, so the browser's download manager takes it
// and the page stays put.
const triggerDownload = (url: string) => {
  const link = document.createElement('a')
  link.href = url
  link.click()
  link.remove()
}

/**
 * Downloads a zip of the track's stems, plus the parent track when the user
 * may download it.
 */
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
