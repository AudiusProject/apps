import { useTracks } from '../tracks/useTracks'
import type { QueryOptions } from '../types'

import { useExploreContent } from './useExploreContent'

/**
 * Combines useExploreContent and useTracks to fetch featured artist coin tracks
 * with prefetched track data. Use this instead of useExploreContent + useTracks
 * separately to avoid the skeleton → nothing → tracks flash caused by the
 * two-step fetch (explore content IDs → track metadata).
 *
 * Shared across web and mobile.
 */
export const useFeaturedArtistCoinTracks = (options?: QueryOptions) => {
  const { data: exploreContent } = useExploreContent(options)

  const tracksQuery = useTracks(exploreContent?.featuredArtistCoinTracks, {
    ...options,
    enabled: options?.enabled !== false
  })

  return {
    trackIds: tracksQuery.data?.map((track) => track.track_id),
    tracks: tracksQuery.data,
    byId: tracksQuery.byId,
    isPending: tracksQuery.isPending,
    isSuccess: tracksQuery.isSuccess,
    isError: tracksQuery.isError
  }
}
