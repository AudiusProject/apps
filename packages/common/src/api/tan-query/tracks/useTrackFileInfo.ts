import { BlobInfo, Id } from '@audius/sdk/services'
import { useQuery } from '@tanstack/react-query'

import { useQueryContext } from '~/api/tan-query/utils'
import { ID } from '~/models/Identifiers'

import { QUERY_KEYS } from '../queryKeys'
import { QueryKey, SelectableQueryOptions } from '../types'

export const getTrackFileInfoQueryKey = (
  trackId: ID | null | undefined,
  original?: boolean
) => {
  return [
    QUERY_KEYS.trackFileInfo,
    trackId,
    { original }
  ] as unknown as QueryKey<BlobInfo>
}

export const useTrackFileInfo = <TResult = BlobInfo>(
  trackId: ID | null | undefined,
  options?: SelectableQueryOptions<BlobInfo, TResult> & {
    original?: boolean
  }
) => {
  const { audiusSdk } = useQueryContext()
  const validTrackId = !!trackId && trackId > 0

  return useQuery({
    queryKey: getTrackFileInfoQueryKey(trackId),
    queryFn: async () => {
      const sdk = await audiusSdk()
      const response = await sdk.tracks.inspectTrack({
        trackId: Id.parse(trackId!),
        original: options?.original ?? false
      })
      return response.data ?? { size: 0, contentType: '' }
    },
    ...options,
    enabled: options?.enabled !== false && validTrackId
  })
}
