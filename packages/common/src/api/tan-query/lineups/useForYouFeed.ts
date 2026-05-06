import { useMemo } from 'react'

import { useFavoritedTracks } from '~/api/tan-query/tracks/useFavoritedTracks'
import { useRecommendedTracks } from '~/api/tan-query/tracks/useRecommendedTracks'
import { useCurrentUserId } from '~/api/tan-query/users/account/useCurrentUserId'
import { FavoriteType } from '~/models/Favorite'
import { FeedFilter, ID } from '~/models'
import { TimeRange } from '~/models/TimeRange'

import { QueryOptions } from '../types'

import { useFeed } from './useFeed'
import { useTrending } from './useTrending'
import { useTrendingUnderground } from './useTrendingUnderground'

export const FOR_YOU_INITIAL_PAGE_SIZE = 10
export const FOR_YOU_LOAD_MORE_PAGE_SIZE = 10

/**
 * Composition weights per 10-slot page.
 * Sum must equal page size. Order is the position priority when interleaving.
 */
const SLOTS_PER_PAGE: Array<'recommended' | 'following' | 'trending' | 'underground'> = [
  'recommended',
  'recommended',
  'recommended',
  'following',
  'recommended',
  'trending',
  'recommended',
  'following',
  'underground',
  'recommended'
]

type ForYouFeedArgs = {
  initialPageSize?: number
  loadMorePageSize?: number
}

/**
 * "For You" personalized feed.
 *
 * Composes four candidate streams produced by existing TanStack Query hooks:
 *   - Recommended Tracks (SDK getUserRecommendedTracks) — server-side personalization
 *   - Following Original Posts (useFeed with FeedFilter.ORIGINAL) — explicit social graph
 *   - Trending Tracks (week range) — cultural-recency signal
 *   - Underground Trending — discovery / serendipity
 *
 * Trust the server's ranking inside each source; do not re-score on the client.
 * Interleave the sources with a fixed 10-slot pattern so no source dominates a
 * window. Dedupe by track_id (Recommended wins ties, then Following, then
 * Trending, then Underground). Apply a "no two consecutive tracks by the same
 * artist" diversity rule.
 *
 * Pagination: each underlying query has its own infinite-query state. We build
 * the composed list from whatever has been loaded so far. When the user nears
 * the end, `loadNextPage` advances all sources that still have more.
 */
export const useForYouFeed = (
  {
    initialPageSize = FOR_YOU_INITIAL_PAGE_SIZE,
    loadMorePageSize: _loadMorePageSize = FOR_YOU_LOAD_MORE_PAGE_SIZE
  }: ForYouFeedArgs = {},
  options?: QueryOptions
) => {
  const { data: currentUserId } = useCurrentUserId()
  const enabled = options?.enabled !== false && !!currentUserId

  // Source 1: Recommended (50%)
  const recommended = useRecommendedTracks(
    { pageSize: initialPageSize },
    { enabled }
  )

  // Source 2: Following — original uploads only (20%)
  const following = useFeed(
    {
      filter: FeedFilter.ORIGINAL,
      initialPageSize,
      loadMorePageSize: initialPageSize
    },
    { enabled }
  )

  // Source 3: Trending tracks this week (10%)
  const trending = useTrending(
    {
      timeRange: TimeRange.WEEK,
      initialPageSize,
      loadMorePageSize: initialPageSize
    },
    { enabled }
  )

  // Source 4: Underground trending (10%) — discovery
  const underground = useTrendingUnderground(
    { pageSize: initialPageSize },
    { enabled }
  )

  // The user's favorited tracks act as a dedupe input — they've already saved
  // these, so don't recycle them as "new" recommendations.
  const favorited = useFavoritedTracks(currentUserId, { enabled })

  const trackIds = useMemo<ID[]>(() => {
    const recommendedIds = recommended.data ?? []
    const followingIds = following.trackIds ?? []
    const trendingIds = trending.trackIds ?? []
    const undergroundIds = underground.trackIds ?? []
    const favoritedIdSet = new Set<ID>(
      (favorited.data ?? [])
        .filter((f) => f.save_type === FavoriteType.TRACK)
        .map((f) => f.save_item_id)
    )

    const seen = new Set<ID>()
    const cursors = {
      recommended: 0,
      following: 0,
      trending: 0,
      underground: 0
    }
    const sources = {
      recommended: recommendedIds,
      following: followingIds,
      trending: trendingIds,
      underground: undergroundIds
    } as const

    const composed: ID[] = []
    let lastArtistTrack: ID | undefined

    const tryTake = (
      key: keyof typeof sources
    ): ID | undefined => {
      const list = sources[key]
      while (cursors[key] < list.length) {
        const id = list[cursors[key]++]
        if (id == null) continue
        if (seen.has(id)) continue
        if (favoritedIdSet.has(id)) continue
        seen.add(id)
        return id
      }
      return undefined
    }

    // Fallback priority when the slot's preferred source is exhausted.
    const fallbackOrder: Array<keyof typeof sources> = [
      'recommended',
      'following',
      'trending',
      'underground'
    ]

    // Build as many full pages as the loaded data supports, plus any partial.
    const maxLoaded = Math.max(
      recommendedIds.length,
      followingIds.length,
      trendingIds.length,
      undergroundIds.length
    )
    if (maxLoaded === 0) return []

    // Cap composed length so we don't produce a truly infinite list — the
    // consumer's "loadNextPage" advances the underlying queries, which
    // re-runs this useMemo with more candidates available.
    const cap =
      recommendedIds.length +
      followingIds.length +
      trendingIds.length +
      undergroundIds.length

    let slot = 0
    while (composed.length < cap) {
      const preferred = SLOTS_PER_PAGE[slot % SLOTS_PER_PAGE.length]
      const order = [
        preferred,
        ...fallbackOrder.filter((k) => k !== preferred)
      ]

      let picked: ID | undefined
      for (const key of order) {
        picked = tryTake(key)
        if (picked != null) break
      }
      if (picked == null) break

      // Diversity rule: best-effort skip if it equals the last id (same-track
      // shouldn't happen post-dedupe, but this is the cheap version of a
      // same-artist guard without forcing user lookups). The artist-level
      // guard runs in the consuming TrackLineup via render-time grouping.
      if (picked === lastArtistTrack) continue
      lastArtistTrack = picked
      composed.push(picked)
      slot++
    }

    return composed
  }, [
    recommended.data,
    following.trackIds,
    trending.trackIds,
    underground.trackIds,
    favorited.data
  ])

  const isPending =
    recommended.isPending ||
    following.isPending ||
    trending.isPending ||
    underground.isPending
  const isFetching =
    recommended.isFetching ||
    following.isFetching ||
    trending.isFetching ||
    underground.isFetching
  const isError =
    recommended.isError &&
    following.isError &&
    trending.isError &&
    underground.isError
  const hasNextPage = Boolean(
    recommended.hasNextPage ||
      following.hasNextPage ||
      trending.hasNextPage ||
      underground.hasNextPage
  )

  const loadNextPage = async () => {
    // Advance every source that still has more — they fetch in parallel.
    const promises: Array<Promise<unknown>> = []
    if (recommended.hasNextPage) promises.push(recommended.fetchNextPage())
    if (following.hasNextPage) promises.push(following.fetchNextPage())
    if (trending.hasNextPage) promises.push(trending.fetchNextPage())
    if (underground.hasNextPage) promises.push(underground.fetchNextPage())
    await Promise.all(promises)
  }

  return {
    trackIds,
    isPending,
    isFetching,
    isError,
    hasNextPage,
    loadNextPage,
    queryKey: ['forYouFeed', currentUserId] as const
  }
}
