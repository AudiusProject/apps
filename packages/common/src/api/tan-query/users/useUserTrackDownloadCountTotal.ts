import { useQuery } from '@tanstack/react-query'

import { useQueryContext } from '~/api/tan-query/utils'

import { QUERY_KEYS } from '../queryKeys'
import { QueryKey, QueryOptions } from '../types'
import { entityCacheOptions } from '../utils/entityCacheOptions'

export const getUserTrackDownloadCountTotalQueryKey = (
  userId: string | null | undefined
) => [QUERY_KEYS.userTracksDownloadCount, userId] as unknown as QueryKey<number>

/**
 * Total download count for all tracks (and stems) owned by the user.
 * Use for dashboard "Downloads" tile instead of summing per-track counts.
 */
export const useUserTrackDownloadCountTotal = (
  userId: string | null | undefined,
  options?: QueryOptions<number>
) => {
  const { audiusSdk } = useQueryContext()

  return useQuery({
    queryKey: getUserTrackDownloadCountTotalQueryKey(userId),
    queryFn: async () => {
      const sdk = await audiusSdk()
      const { data } = await sdk.users.getUserTracksDownloadCount({
        id: userId!
      })
      return data
    },
    ...options,
    ...entityCacheOptions,
    enabled: options?.enabled !== false && !!userId
  })
}
