import { useEffect, useRef } from 'react'

import { QUERY_KEYS } from '@audius/common/api'
import { SquareSizes } from '@audius/common/models'
import { useIsRestoring, useQueryClient } from '@tanstack/react-query'
import { Image as RNImage } from 'react-native'

// Number of tiles in the first screen-worth of trending content.
const TRENDING_PREFETCH_COUNT = 10

// Mirror of the IMAGE_CACHE used by useImageSize. Populated here so that
// when tiles mount and call useImageSize, they find the URL in the cache
// and set imageUrl immediately (skipping the async preload step entirely).
const getImageCache = (): Set<string> | undefined =>
  typeof global !== 'undefined' ? global.IMAGE_CACHE : undefined

/**
 * Fires once when the PersistQueryClientProvider finishes hydrating.
 *
 * At that moment the React Query cache already holds restored track and
 * artwork data, but the JS-level IMAGE_CACHE (used by useImageSize) is
 * empty. We read the first page of trending track IDs from the cache,
 * prefetch each 150×150 artwork URL via RNImage.prefetch (native disk-
 * cache hit → near-instant), and add successful URLs to IMAGE_CACHE.
 *
 * Result: when TrackTile components mount a frame later and call
 * useImageSize, they find the URL in IMAGE_CACHE and set imageUrl
 * synchronously, so the Artwork built-in skeleton is never shown —
 * images appear on the very first tile render.
 */
export const usePrefetchTrendingImages = () => {
  const isRestoring = useIsRestoring()
  const queryClient = useQueryClient()
  const hasPrefetchedRef = useRef(false)

  useEffect(() => {
    if (isRestoring || hasPrefetchedRef.current) return
    hasPrefetchedRef.current = true

    // Read the week trending IDs from the hydrated query cache.
    // Key shape: [QUERY_KEYS.trendingIds, { genre }]
    const trendingIdsQueries = queryClient.getQueriesData<{
      week?: number[]
      month?: number[]
      year?: number[]
    }>({ queryKey: [QUERY_KEYS.trendingIds] })

    const weekIds =
      trendingIdsQueries[0]?.[1]?.week?.slice(0, TRENDING_PREFETCH_COUNT) ?? []

    if (weekIds.length === 0) return

    const imageCache = getImageCache()

    for (const trackId of weekIds) {
      // Key shape: [QUERY_KEYS.track, trackId]
      const track = queryClient.getQueryData<{
        artwork?: Partial<Record<SquareSizes, string>>
      }>([QUERY_KEYS.track, trackId])

      const url = track?.artwork?.[SquareSizes.SIZE_150_BY_150]
      if (!url || imageCache?.has(url)) continue

      RNImage.prefetch(url)
        .then((success) => {
          if (success) imageCache?.add(url)
        })
        .catch(() => {
          // Prefetch failures are non-fatal — images load normally via useImageSize.
        })
    }
  }, [isRestoring, queryClient])
}
