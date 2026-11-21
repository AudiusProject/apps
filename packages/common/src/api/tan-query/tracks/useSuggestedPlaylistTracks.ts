import { useCallback, useEffect, useState } from 'react'

import { difference, shuffle } from 'lodash'
import { useDispatch } from 'react-redux'

import { ID } from '~/models/Identifiers'
import { TimeRange } from '~/models/TimeRange'
import { Track } from '~/models/Track'
import { addTrackToPlaylist } from '~/store/cache/collections/actions'

import { useCollection } from '../collection/useCollection'
import { useTrending } from '../lineups/useTrending'
import { useFavoritedTracks } from '../tracks/useFavoritedTracks'
import { useTracks } from '../tracks/useTracks'
import { useCurrentUserId } from '../users/account/useCurrentUserId'

export const SUGGESTED_TRACK_COUNT = 5

export type SuggestedTrack = {
  id: ID
  track: Track
}

export const useSuggestedPlaylistTracks = (collectionId: ID) => {
  const { data: currentUserId } = useCurrentUserId()
  const [suggestedTrackIds, setSuggestedTrackIds] = useState<ID[]>([])

  const { data: collection, isPending: isCollectionPending } =
    useCollection(collectionId)

  const { data: favorites = [], isPending: isFavoritedTracksPending } =
    useFavoritedTracks(currentUserId)

  const {
    data: trendingTracks = [],
    loadNextPage: loadNextPageTrending,
    isFetching: isTrendingTracksFetching
  } = useTrending({ timeRange: TimeRange.WEEK })

  const getRandomTracksFromList = useCallback(() => {
    const favoriteIds = favorites.map((favorite) => favorite.save_item_id)
    const trendingIds = trendingTracks.map((track) => track.id)
    const combinedIds = shuffle(
      difference(
        [...new Set([...favoriteIds, ...trendingIds])],
        collection?.trackIds ?? []
      )
    )
    return combinedIds.slice(0, SUGGESTED_TRACK_COUNT)
  }, [collection?.trackIds, favorites, trendingTracks])

  useEffect(() => {
    if (
      !isTrendingTracksFetching &&
      !isFavoritedTracksPending &&
      !isCollectionPending &&
      suggestedTrackIds.length === 0
    ) {
      setSuggestedTrackIds(getRandomTracksFromList())
    }
  }, [
    isTrendingTracksFetching,
    isFavoritedTracksPending,
    isCollectionPending,
    getRandomTracksFromList,
    suggestedTrackIds.length
  ])

  const { data: suggestedTracks = [] } = useTracks(suggestedTrackIds)

  const dispatch = useDispatch()
  const onAddTrack = useCallback(
    async (trackId: ID) => {
      dispatch(addTrackToPlaylist(trackId, collectionId))
    },
    [collectionId, dispatch]
  )
  const onRefresh = useCallback(async () => {
    const moreTracks = getRandomTracksFromList()
    if (moreTracks.length < SUGGESTED_TRACK_COUNT) {
      setSuggestedTrackIds([])
      loadNextPageTrending()
    } else {
      setSuggestedTrackIds(moreTracks)
    }
  }, [loadNextPageTrending, getRandomTracksFromList])

  return {
    suggestedTracks,
    onRefresh,
    onAddTrack
  }
}
