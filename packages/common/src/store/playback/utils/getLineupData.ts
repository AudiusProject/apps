import { InfiniteData, QueryClient } from '@tanstack/react-query'

import { getRecommendedTracksQueryKey } from '~/api/tan-query/tracks/useRecommendedTracks'
import { ID } from '~/models'

/**
 * Gets lineup data from tan-query cache or API based on lineupId
 * For now, only supports "explore:for-you" which uses useRecommendedTracks
 */
export const getLineupData = (
  lineupId: string,
  queryClient: QueryClient,
  currentUserId: ID | null
): ID[] => {
  if (lineupId === 'explore:for-you') {
    // Get from tan-query cache
    // useRecommendedTracks uses select: (data) => data.pages.flat()
    // but the cache stores InfiniteData, so we need to flatten it
    const queryKey = getRecommendedTracksQueryKey(currentUserId, {
      pageSize: 10,
      timeRange: 'week' as any
    })
    const data = queryClient.getQueryData<InfiniteData<ID[]>>(queryKey)
    if (data) {
      return data.pages.flat()
    }
    return []
  }

  // Future: Add support for other lineup types
  // if (lineupId.startsWith('trending:')) { ... }
  // if (lineupId.startsWith('user:')) { ... }

  throw new Error(`Unsupported lineupId: ${lineupId}`)
}
