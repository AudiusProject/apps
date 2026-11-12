import { useCallback, useState } from 'react'

import { uploadBackdropImage, useQueryContext } from '@audius/common/api'

/**
 * Handles upload of a contest cover photo. Uses the shared
 * `uploadBackdropImage` helper (also used for fan club banners), which uploads
 * the file with the `img_backdrop` template (wide aspect-ratio) and resolves
 * to a validator node URL the form can persist in `eventData.coverPhotoUrl`.
 */
export const useUploadContestCover = () => {
  const { audiusSdk } = useQueryContext()
  const [isUploading, setIsUploading] = useState(false)

  const upload = useCallback(
    async (file: File): Promise<string | null> => {
      setIsUploading(true)
      try {
        const sdk = await audiusSdk()
        return await uploadBackdropImage(sdk, file)
      } catch (error) {
        console.error('HostRemixContest', error as Error)
        return null
      } finally {
        setIsUploading(false)
      }
    },
    [audiusSdk]
  )

  return { upload, isUploading }
}
