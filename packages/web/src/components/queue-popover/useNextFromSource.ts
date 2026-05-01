import { useMemo } from 'react'

import { ID } from '@audius/common/models'
import { playbackSelectors } from '@audius/common/store'
import { useQueryClient } from '@tanstack/react-query'
import { useSelector } from 'react-redux'

const { getPlaybackQueue, getQuerySource } = playbackSelectors

type LineupPage = Array<{ id: number | string; type?: string }>
type InfiniteData<T> = { pages: T[]; pageParams: unknown[] }

const MAX_NEXT_FROM = 10

/**
 * Reads the source lineup (the lineup that produced the current playback
 * via `playFrom`) from the tan-query cache and returns the next tracks
 * that are NOT already in the playback queue.
 */
export const useNextFromSource = () => {
  const queryClient = useQueryClient()
  const querySource = useSelector(getQuerySource)
  const queue = useSelector(getPlaybackQueue)

  return useMemo<{ trackIds: ID[]; sourceKey: string | null }>(() => {
    if (!querySource) return { trackIds: [], sourceKey: null }
    const data = queryClient.getQueryData<InfiniteData<LineupPage>>(
      querySource.queryKey as any
    )
    if (!data?.pages) {
      const sourceKey =
        Array.isArray(querySource.queryKey) && querySource.queryKey[0]
          ? String(querySource.queryKey[0])
          : null
      return { trackIds: [], sourceKey }
    }

    const inQueue = new Set(queue.map((t) => t.trackId))
    const upcoming: ID[] = []
    for (const page of data.pages) {
      for (const item of page) {
        if (!item) continue
        // Lineup pages mix tracks and collections — only take tracks.
        if (item.type && item.type !== 'track') continue
        const id = typeof item.id === 'number' ? item.id : Number(item.id)
        if (!Number.isFinite(id)) continue
        if (inQueue.has(id)) continue
        upcoming.push(id)
        if (upcoming.length >= MAX_NEXT_FROM) break
      }
      if (upcoming.length >= MAX_NEXT_FROM) break
    }

    const sourceKey =
      Array.isArray(querySource.queryKey) && querySource.queryKey[0]
        ? String(querySource.queryKey[0])
        : null
    return { trackIds: upcoming, sourceKey }
  }, [querySource, queue, queryClient])
}
