import { useMemo } from 'react'

import { useQuery } from '@tanstack/react-query'

import { useQueryContext } from '~/api/tan-query/utils'

import { QUERY_KEYS } from '../queryKeys'
import { QueryKey, QueryOptions } from '../types'
import { entityCacheOptions } from '../utils/entityCacheOptions'

export type TrackDownloadCount = { id: string; download_count: number }

export const getTrackDownloadCountsQueryKey = (trackIds: string[]) => {
  const stable = [...trackIds].sort()
  return [QUERY_KEYS.trackDownloadCounts, stable] as unknown as QueryKey<
    TrackDownloadCount[]
  >
}

export const useTrackDownloadCounts = (
  trackIds: string[] | null | undefined,
  options?: QueryOptions<TrackDownloadCount[]>
) => {
  const { audiusSdk } = useQueryContext()

  const uniqueIds = useMemo(
    () =>
      trackIds?.filter((id, i, self) => self.indexOf(id) === i && !!id) ?? [],
    [trackIds]
  )

  const query = useQuery({
    queryKey: getTrackDownloadCountsQueryKey(uniqueIds),
    queryFn: async () => {
      const sdk = await audiusSdk()
      return sdk.tracks.getTrackDownloadCounts({ trackIds: uniqueIds })
    },
    ...options,
    ...entityCacheOptions,
    enabled: options?.enabled !== false && uniqueIds.length > 0
  })

  const byId = useMemo(() => {
    const map: Record<string, number> = {}
    if (query.data) {
      for (const row of query.data) {
        map[row.id] = row.download_count
      }
    }
    return map
  }, [query.data])

  return {
    ...query,
    data: query.data,
    byId
  }
}
