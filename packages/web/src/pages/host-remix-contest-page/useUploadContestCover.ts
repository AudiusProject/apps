import { useCallback, useState } from 'react'

import { uploadBackdropImage, useQueryContext } from '@audius/common/api'

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
