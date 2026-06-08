import { useCallback, useState } from 'react'

import { useQueryContext } from '@audius/common/api'

/**
 * Handles mediorum upload of a contest cover photo. Mirrors the pattern
 * used by useLaunchCoin / useUpdateFanClub for banner images — uploads the
 * file with `img_backdrop` template (wide aspect-ratio) and resolves to a
 * content-node URL the form can persist in `eventData.coverPhotoUrl`.
 */
export const useUploadContestCover = () => {
  const { audiusSdk } = useQueryContext()
  const [isUploading, setIsUploading] = useState(false)

  const upload = useCallback(
    async (file: File): Promise<string | null> => {
      setIsUploading(true)
      try {
        const sdk = await audiusSdk()
        const uploadResponse = await sdk.services.storage
          .uploadFile({
            file,
            metadata: { template: 'img_backdrop' }
          })
          .start()

        const results = (uploadResponse.results ?? {}) as Record<string, string>
        const prioritizedSizes = ['2000x', '1500x', '1280x', '1000x', '640x']
        let cid: string | undefined
        for (const size of prioritizedSizes) {
          if (results[size]) {
            cid = results[size]
            break
          }
        }
        if (!cid) cid = Object.values(results)[0]
        if (!cid) throw new Error('Upload returned no CID')

        const contentNodeEndpoint = await (
          sdk.services.storage as any
        ).storageNodeSelector?.getSelectedNode()
        if (!contentNodeEndpoint) {
          throw new Error('No content node available')
        }

        return `${contentNodeEndpoint}/content/${cid}`
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
