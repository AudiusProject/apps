import { useEffect, useRef } from 'react'

import { QUERY_KEYS } from '@audius/common/api'
import { SquareSizes } from '@audius/common/models'
import { useIsRestoring, useQueryClient } from '@tanstack/react-query'
import { Image as RNImage } from 'react-native'

const TRENDING_PREFETCH_COUNT = 10

const getImageCache = (): Set<string> | undefined =>
  typeof global !== 'undefined' ? global.IMAGE_CACHE : undefined

export const usePrefetchTrendingImages = () => {
  const isRestoring = useIsRestoring()
  const queryClient = useQueryClient()
  const hasPrefetchedRef = useRef(false)

  useEffect(() => {
    if (isRestoring || hasPrefetchedRef.current) return
    hasPrefetchedRef.current = true

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
