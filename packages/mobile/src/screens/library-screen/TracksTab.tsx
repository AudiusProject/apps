import React, { useCallback, useMemo, useState } from 'react'

import { useLibraryTracks, useTracks, useUsers } from '@audius/common/api'
import { Kind, Status } from '@audius/common/models'
import type { ID, UID, Track, User } from '@audius/common/models'
import {
  libraryPageSelectors,
  LibraryCategory,
  LibraryPageTabs,
  playbackActions,
  playbackSelectors,
  reachabilitySelectors
} from '@audius/common/store'
import type { PlaybackTrack } from '@audius/common/store'
import { makeStableUid, type Nullable } from '@audius/common/utils'
import { debounce } from 'lodash'
import { View } from 'react-native'
import { useDispatch, useSelector } from 'react-redux'

import { PlayBarChin } from 'app/components/core/PlayBarChin'
import { EmptyTileCTA } from 'app/components/empty-tile-cta'
import { FilterInput } from 'app/components/filter-input'
import { TrackList } from 'app/components/track-list'
import { getIsDoneLoadingFromDisk } from 'app/store/offline-downloads/selectors'
import { makeStyles } from 'app/styles'

import { NoTracksPlaceholder } from './NoTracksPlaceholder'
import { OfflineContentBanner } from './OfflineContentBanner'

const { getSelectedCategoryLocalTrackAdds, getCategory } = libraryPageSelectors
const { getIsReachable } = reachabilitySelectors

const messages = {
  emptyTracksFavoritesText: "You haven't favorited any tracks yet.",
  emptyTracksRepostsText: "You haven't reposted any tracks yet.",
  emptyTracksPurchasedText: "You haven't purchased any tracks yet.",
  emptyTracksAllText:
    "You haven't favorited, reposted, or purchased any tracks yet.",
  noResultsText: 'No tracks found matching your search.',
  inputPlaceholder: 'Filter Tracks'
}

const useStyles = makeStyles(({ palette, spacing }) => ({
  root: {
    flex: 1
  },
  rowsContainer: {
    flex: 1,
    marginTop: spacing(3),
    marginBottom: spacing(4),
    marginHorizontal: spacing(3),
    borderWidth: 1,
    borderColor: palette.neutralLight8,
    backgroundColor: palette.white,
    borderRadius: 8,
    overflow: 'hidden'
  },
  emptyState: {
    marginTop: spacing(3),
    marginHorizontal: spacing(3)
  }
}))

const FETCH_LIMIT = 50
const FILTER_DEBOUNCE_MS = 250

function useTracksWithUsers(trackIds: ID[]) {
  const { data: tracks = [], byId: tracksById } = useTracks(trackIds)
  const ownerIds = useMemo(
    () => tracks.map((track) => track.owner_id),
    [tracks]
  )
  const { byId: usersById } = useUsers(ownerIds)

  return useMemo(
    () =>
      trackIds.map((id) => {
        const track = tracksById[id]
        const user = usersById[track?.owner_id]
        return {
          uid: makeStableUid(Kind.TRACKS, id, 'SAVED_TRACKS'),
          track,
          user
        }
      }),
    [trackIds, tracksById, usersById]
  )
}

export const TracksTab = () => {
  const dispatch = useDispatch()
  const styles = useStyles()
  const isReachable = useSelector(getIsReachable)

  const [filterValue, setFilterValue] = useState('')
  const [debouncedFilterValue, setDebouncedFilterValue] = useState('')
  const selectedCategory = useSelector((state) =>
    getCategory(state, { currentTab: LibraryPageTabs.TRACKS })
  )

  const {
    trackIds: fetchedTrackIds,
    isPending: isLibraryQueryPending,
    isFetchingNextPage,
    isError: isLibraryQueryError,
    hasNextPage,
    fetchNextPage
  } = useLibraryTracks({
    category: selectedCategory,
    query: debouncedFilterValue,
    pageSize: FETCH_LIMIT
  })

  const isDoneLoadingFromDisk = useSelector(getIsDoneLoadingFromDisk)
  const savedTracksStatus = isReachable
    ? isLibraryQueryError
      ? Status.ERROR
      : isLibraryQueryPending
        ? Status.LOADING
        : Status.SUCCESS
    : isDoneLoadingFromDisk
      ? Status.SUCCESS
      : Status.LOADING

  const isFetchingMore = isFetchingNextPage
  const localAdditions = useSelector(getSelectedCategoryLocalTrackAdds)

  const saveCount = useMemo(
    () => fetchedTrackIds.length + Object.keys(localAdditions).length,
    [fetchedTrackIds, localAdditions]
  )
  const trackSkeletonRowCount = useMemo(
    () => (saveCount > 0 ? Math.min(saveCount, 10) : 10),
    [saveCount]
  )

  const lineupStatus = savedTracksStatus

  // Combine server-fetched ids with locally-added ones (optimistic favorites
  // / reposts / purchases that haven't yet been included in the server page).
  const trackIds = useMemo(() => {
    const ids = new Set<ID>()
    fetchedTrackIds.forEach((id) => ids.add(id))
    Object.keys(localAdditions).forEach((id) => ids.add(Number(id)))
    return Array.from(ids)
  }, [fetchedTrackIds, localAdditions])

  const trackUids = useMemo(
    () => trackIds.map((id) => makeStableUid(Kind.TRACKS, id, 'SAVED_TRACKS')),
    [trackIds]
  )

  const filterTrack = useCallback(
    (track: Nullable<Track>, user: Nullable<User>) => {
      if (!track || !user) return false
      if (!filterValue) return true

      const searchValue = filterValue.toLowerCase()
      return (
        track.title.toLowerCase().includes(searchValue) ||
        user.name.toLowerCase().includes(searchValue) ||
        user.handle.toLowerCase().includes(searchValue)
      )
    },
    [filterValue]
  )

  const trackData = useTracksWithUsers(trackIds)
  const isLoadingTracks = trackData.some(({ track, user }) => !track || !user)

  let emptyTabText: string
  if (selectedCategory === LibraryCategory.All) {
    emptyTabText = messages.emptyTracksAllText
  } else if (selectedCategory === LibraryCategory.Favorite) {
    emptyTabText = messages.emptyTracksFavoritesText
  } else if (selectedCategory === LibraryCategory.Repost) {
    emptyTabText = messages.emptyTracksRepostsText
  } else {
    emptyTabText = messages.emptyTracksPurchasedText
  }

  const filteredTrackEntries = useMemo(() => {
    return trackData.filter(({ track, user }) => filterTrack(track, user))
  }, [trackData, filterTrack])
  const filteredTrackUids = useMemo(
    () => filteredTrackEntries.map(({ uid }) => uid),
    [filteredTrackEntries]
  )
  const filteredTrackIds = useMemo(
    () =>
      filteredTrackEntries
        .map(({ track }) => track?.track_id)
        .filter((id): id is ID => Boolean(id)),
    [filteredTrackEntries]
  )

  const allTracksFetched = useMemo(() => {
    return !hasNextPage && !filterValue
  }, [hasNextPage, filterValue])

  const handleMoreFetchSaves = useCallback(() => {
    if (allTracksFetched || isFetchingMore || !isReachable || !hasNextPage) {
      return
    }
    fetchNextPage().catch(() => undefined)
  }, [
    allTracksFetched,
    isFetchingMore,
    isReachable,
    hasNextPage,
    fetchNextPage
  ])

  const currentPlaybackTrackId = useSelector(
    playbackSelectors.getCurrentTrackId
  )
  const isPlaying = useSelector(playbackSelectors.getPlaying)

  // Matches legacy `saveTracksLineupActions.prefix` so AudioPlayer's
  // source-based offline-download check keeps working.
  const playbackSource = 'SAVED_TRACKS'
  const playbackQueue: PlaybackTrack[] = useMemo(
    () =>
      filteredTrackIds.map((id) => ({
        trackId: id,
        source: playbackSource
      })),
    [filteredTrackIds]
  )

  const togglePlay = useCallback(
    (_uid: UID, id: ID) => {
      if (currentPlaybackTrackId === id && isPlaying) {
        dispatch(playbackActions.togglePlay())
        return
      }
      if (currentPlaybackTrackId === id && !isPlaying) {
        dispatch(playbackActions.play())
        return
      }
      const startIndex = playbackQueue.findIndex((t) => t.trackId === id)
      if (startIndex < 0) return
      dispatch(
        playbackActions.playFrom({
          tracks: playbackQueue,
          startIndex,
          querySource: null
        })
      )
    },
    [dispatch, currentPlaybackTrackId, isPlaying, playbackQueue]
  )

  const commitFilterValue = useMemo(
    () => debounce(setDebouncedFilterValue, FILTER_DEBOUNCE_MS),
    []
  )
  const handleChangeFilterValue = useCallback(
    (value: string) => {
      setFilterValue(value)
      commitFilterValue(value)
    },
    [commitFilterValue]
  )

  const isPending =
    lineupStatus !== Status.SUCCESS ||
    savedTracksStatus !== Status.SUCCESS ||
    isLoadingTracks

  const showTrackSkeletonList = isPending && filteredTrackUids.length === 0
  const shouldShowFilterInput =
    trackUids.length > 0 || filterValue || (isPending && saveCount > 0)

  const renderBody = () => {
    if (filteredTrackUids.length === 0 && !isPending) {
      if (!isReachable) {
        return (
          <View style={styles.emptyState}>
            <NoTracksPlaceholder />
          </View>
        )
      }
      return (
        <View style={styles.emptyState}>
          <EmptyTileCTA
            message={filterValue ? messages.noResultsText : emptyTabText}
          />
        </View>
      )
    }

    if (!showTrackSkeletonList && filteredTrackUids.length === 0) {
      return null
    }

    return (
      <View style={styles.rowsContainer}>
        <TrackList
          hideArt
          showSkeleton={showTrackSkeletonList}
          skeletonRowCount={trackSkeletonRowCount}
          hasNextPage={
            isFetchingMore && !allTracksFetched && isReachable === true
          }
          onEndReached={handleMoreFetchSaves}
          onEndReachedThreshold={1.5}
          ListFooterComponent={<PlayBarChin />}
          togglePlay={togglePlay}
          trackItemAction='overflow'
          uids={showTrackSkeletonList ? undefined : filteredTrackUids}
        />
      </View>
    )
  }

  return (
    <View style={styles.root}>
      <OfflineContentBanner />
      {shouldShowFilterInput ? (
        <FilterInput
          placeholder={messages.inputPlaceholder}
          onChangeText={handleChangeFilterValue}
        />
      ) : null}
      {renderBody()}
    </View>
  )
}
