import { Id, type BlobInfo } from '@audius/sdk/services'
import { useQuery } from '@tanstack/react-query'

import { useQueryContext } from '~/api/tan-query/utils'
import { DownloadQuality } from '~/models'
import { ID } from '~/models/Identifiers'

import { QUERY_KEYS } from '../queryKeys'
import { QueryKey, SelectableQueryOptions } from '../types'

type FileSizeResponse = {
  [trackId: ID]: {
    [k in DownloadQuality]?: number
  }
}

type UseFileSizesProps = {
  trackIds: ID[]
  downloadQuality: DownloadQuality
}

export const getFileSizesQueryKey = (args: {
  trackIds: ID[]
  downloadQuality: DownloadQuality
}) => [QUERY_KEYS.fileSizes, args] as unknown as QueryKey<FileSizeResponse>

/**
 * Returns file sizes for given track ids and download quality (mp3 vs lossless)
 */
export const useFileSizes = (
  { trackIds, downloadQuality }: UseFileSizesProps,
  options?: SelectableQueryOptions<FileSizeResponse>
) => {
  const { audiusSdk } = useQueryContext()

  return useQuery({
    queryKey: getFileSizesQueryKey({ trackIds, downloadQuality }),
    queryFn: async () => {
      const sdk = await audiusSdk()
      const res = await sdk.tracks.inspectTracks({
        id: trackIds.map((trackId) => Id.parse(trackId)),
        original: downloadQuality === DownloadQuality.ORIGINAL
      })

      return (res?.data ?? []).reduce<FileSizeResponse>(
        (acc, blobInfo: BlobInfo, index: number) => {
          const trackId = trackIds[index]
          acc[trackId] = {
            [downloadQuality]: blobInfo?.size
          }
          return acc
        },
        {}
      )
    },
    ...options,
    enabled:
      options?.enabled !== false && trackIds.length > 0 && !!downloadQuality
  })
}
