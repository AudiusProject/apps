import { useMemo } from 'react'

import { useTracks, useLibraryTracks } from '@audius/common/api'
import { ID } from '@audius/common/models'
import {
  GetUserLibraryTracksSortDirectionEnum,
  GetUserLibraryTracksSortMethodEnum,
  GetUserLibraryTracksTypeEnum
} from '@audius/sdk'

import { UserCard, UserCardSkeleton } from 'components/user-card'
import { useIsMobile } from 'hooks/useIsMobile'

import { Carousel } from '../../search-explore-page/components/desktop/Carousel'

const PAGE_SIZE = 50
const TOP_N = 12
const NINETY_DAYS_MS = 1000 * 60 * 60 * 24 * 90
const FAVORITE_WEIGHT = 1.0
const REPOST_WEIGHT = 1.0
const BOTH_BOOST = 1.5

const messages = {
  title: 'Your Top Artists'
}

type LibraryItem = {
  id: ID
  type: string
  timestamp?: string
}

const filterRecent = (items: LibraryItem[], cutoffMs: number) => {
  return items.filter((item) => {
    if (!item.timestamp) return false
    const t = new Date(item.timestamp).getTime()
    if (Number.isNaN(t)) return false
    return t >= cutoffMs
  })
}

export const YourTopArtistsSection = () => {
  const isMobile = useIsMobile()

  const {
    data: favoriteData,
    isLoading: isFavoritesLoading,
    isError: isFavoritesError
  } = useLibraryTracks({
    category: GetUserLibraryTracksTypeEnum.Favorite,
    sortMethod: GetUserLibraryTracksSortMethodEnum.AddedDate,
    sortDirection: GetUserLibraryTracksSortDirectionEnum.Desc,
    pageSize: PAGE_SIZE
  })

  const {
    data: repostData,
    isLoading: isRepostsLoading,
    isError: isRepostsError
  } = useLibraryTracks({
    category: GetUserLibraryTracksTypeEnum.Repost,
    sortMethod: GetUserLibraryTracksSortMethodEnum.AddedDate,
    sortDirection: GetUserLibraryTracksSortDirectionEnum.Desc,
    pageSize: PAGE_SIZE
  })

  const allIds = useMemo(() => {
    const set = new Set<ID>()
    favoriteData?.forEach((d) => set.add(d.id as ID))
    repostData?.forEach((d) => set.add(d.id as ID))
    return Array.from(set)
  }, [favoriteData, repostData])

  const { byId: trackById, isLoading: isTracksLoading } = useTracks(allIds)

  const topArtistIds = useMemo(() => {
    if (!favoriteData || !repostData) return []
    const cutoff = Date.now() - NINETY_DAYS_MS

    const recentFavorites = filterRecent(favoriteData as LibraryItem[], cutoff)
    const recentReposts = filterRecent(repostData as LibraryItem[], cutoff)

    type Bucket = { score: number; latestTs: number }
    const perArtist = new Map<ID, Bucket>()
    const seenTrackOwner = new Map<ID, { weight: number; ts: number }>()

    const addAction = (trackId: ID, ts: number, weight: number) => {
      const track = trackById[trackId]
      if (!track) return
      const ownerId = track.owner_id
      if (!ownerId) return

      // Track-level dedupe: if same track has been seen, boost weight
      const existing = seenTrackOwner.get(trackId)
      if (existing) {
        // Both favorite and repost present — replace contribution with boosted weight
        const bucket = perArtist.get(ownerId)
        if (bucket) {
          bucket.score = bucket.score - existing.weight + BOTH_BOOST
          bucket.latestTs = Math.max(bucket.latestTs, Math.min(existing.ts, ts))
        }
        seenTrackOwner.set(trackId, { weight: BOTH_BOOST, ts })
        return
      }

      seenTrackOwner.set(trackId, { weight, ts })
      const bucket = perArtist.get(ownerId)
      if (bucket) {
        bucket.score += weight
        bucket.latestTs = Math.max(bucket.latestTs, ts)
      } else {
        perArtist.set(ownerId, { score: weight, latestTs: ts })
      }
    }

    recentFavorites.forEach((item) => {
      const ts = item.timestamp ? new Date(item.timestamp).getTime() : 0
      addAction(item.id, ts, FAVORITE_WEIGHT)
    })
    recentReposts.forEach((item) => {
      const ts = item.timestamp ? new Date(item.timestamp).getTime() : 0
      addAction(item.id, ts, REPOST_WEIGHT)
    })

    return Array.from(perArtist.entries())
      .sort((a, b) => b[1].score - a[1].score)
      .slice(0, TOP_N)
      .map(([artistId]) => artistId)
  }, [favoriteData, repostData, trackById])

  if (isFavoritesError || isRepostsError) return null

  const isLoading = isFavoritesLoading || isRepostsLoading || isTracksLoading

  if (!isLoading && topArtistIds.length === 0) return null

  return (
    <Carousel title={messages.title}>
      {isLoading
        ? Array.from({ length: 6 }).map((_, i) => (
            <UserCardSkeleton key={i} size={isMobile ? 'xs' : 's'} noShimmer />
          ))
        : topArtistIds.map((id) => <UserCard key={id} id={id} size='s' />)}
    </Carousel>
  )
}
