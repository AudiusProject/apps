import React, { useCallback, useEffect, useMemo, useState } from 'react'

import { useTracks, useUsers } from '@audius/common/api'
import { Kind, Status } from '@audius/common/models'
import type { ID, UID, Track, User } from '@audius/common/models'
import {
  libraryPageActions,
  libraryPageSelectors,
  LibraryCategory,
  LibraryPageTabs,
  playbackActions,
  playbackSelectors,
  reachabilitySelectors
} from '@audius/common/store'
import type { PlaybackTrack } from '@audius/common/store'
import { makeStableUid, Uid, type Nullable } from '@audius/common/utils'
import { debounce } from 'lodash'
import Animated, { Layout } from 'react-native-reanimated'
import { useDispatch, useSelector } from 'react-redux'

import { Tile, VirtualizedScrollView } from 'app/components/core'
import { EmptyTileCTA } from 'app/components/empty-tile-cta'
import { FilterInput } from 'app/components/filter-input'
import { TrackList } from 'app/components/track-list'
import { WithLoader } from 'app/components/with-loader/WithLoader'
import { getIsDoneLoadingFromDisk } from 'app/store/offline-downloads/selectors'
import { makeStyles } from 'app/styles'

import { NoTracksPlaceholder } from './NoTracksPlaceholder'
import { OfflineContentBanner } from './OfflineContentBanner'

const { fetchSaves: fetchSavesAction, fetchMoreSaves } = libraryPageActions
const {
  getTrackSaves,
  getLibraryTracksStatus,
  getInitialFetchStatus,
  getSelectedCategoryLocalTrackAdds,
  getIsFetchingMore,
  getCategory
} = libraryPageSelectors
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

const useStyles = makeStyles(({ spacing }) => ({
  container: {
    marginBottom: spacing(4),
    marginHorizontal: spacing(3)
  },
  containerWithTopSpacing: {
    marginTop: spacing(3),
    marginBottom: spacing(4),
    marginHorizontal: spacing(3)
  },
  trackList: {
    borderRadius: 8,
    overflow: 'hidden'
  },
  spinnerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: spacing(12)
  }
}))

const FETCH_LIMIT = 50

function useTracksWithUsers(trackUids: string[]) {
  const trackIds = trackUids.map((uid) => Uid.fromString(uid).id as ID)
  const { data: tracks = [], byId: tracksById } = useTracks(trackIds)
  const { byId: usersById } = useUsers(tracks.map((track) => track.owner_id))

  return trackUids.map((uid) => {
    const track = tracksById[Uid.fromString(uid).id]
    const user = usersById[track?.owner_id]
    return { uid, track, user }
  })
}

export const TracksTab = () => {
  const dispatch = useDispatch()
  const styles = useStyles()
  const isReachable = useSelector(getIsReachable)

  const [filterValue, setFilterValue] = useState('')
  const [fetchPage, setFetchPage] = useState(0)
  const selectedCategory = useSelector((state) =>
    getCategory(state, { currentTab: LibraryPageTabs.TRACKS })
  )
  const savedTracksStatus = useSelector((state) => {
    const onlineSavedTracksStatus = getLibraryTracksStatus(state)
    const isDoneLoadingFromDisk = getIsDoneLoadingFromDisk(state)
    const offlineSavedTracksStatus = isDoneLoadingFromDisk
      ? Status.SUCCESS
      : Status.LOADING
    return isReachable ? onlineSavedTracksStatus : offlineSavedTracksStatus
  })

  const initialFetch = useSelector(getInitialFetchStatus)
  const isFetchingMore = useSelector(getIsFetchingMore)
  const saves = useSelector(getTrackSaves)
  const localAdditions = useSelector(getSelectedCategoryLocalTrackAdds)

  const saveCount = useMemo(
    () => saves.length + Object.keys(localAdditions).length,
    [saves, localAdditions]
  )
  const trackSkeletonRowCount = useMemo(
    () => (saveCount > 0 ? Math.min(saveCount, 10) : 10),
    [saveCount]
  )

  const fetchSaves = useCallback(() => {
    dispatch(
      fetchSavesAction(filterValue, selectedCategory, '', '', 0, FETCH_LIMIT)
    )
  }, [dispatch, filterValue, selectedCategory])

  // Fetch saves on mount / when category or filter changes (previously
  // handled by useFavoritesLineup via reachability effect).
  useEffect(() => {
    fetchSaves()
  }, [fetchSaves])

  const lineupStatus = savedTracksStatus

  // Build UIDs from the save list directly (no more legacy lineup state).
  const trackUids = useMemo(() => {
    const ids = new Set<ID>()
    saves.forEach((s: any) => ids.add(s.save_item_id))
    Object.keys(localAdditions).forEach((id) => ids.add(Number(id)))
    return Array.from(ids).map((id) =>
      makeStableUid(Kind.TRACKS, id, 'SAVED_TRACKS')
    )
  }, [saves, localAdditions])

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

  const trackData = useTracksWithUsers(trackUids)
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

  const filteredTrackUids = useMemo(() => {
    return trackData
      .filter(({ track, user }) => filterTrack(track, user))
      .map(({ uid }) => uid)
  }, [trackData, filterTrack])

  const allTracksFetched = useMemo(() => {
    return trackUids.length === saveCount && !filterValue
  }, [trackUids, saveCount, filterValue])

  const handleMoreFetchSaves = useCallback(() => {
    if (allTracksFetched || isFetchingMore || !isReachable) {
      return
    }

    const nextPage = fetchPage + 1
    dispatch(
      fetchMoreSaves(
        filterValue,
        selectedCategory,
        '',
        '',
        nextPage * FETCH_LIMIT,
        FETCH_LIMIT
      )
    )
    setFetchPage(nextPage)
  }, [
    allTracksFetched,
    selectedCategory,
    dispatch,
    fetchPage,
    filterValue,
    isFetchingMore,
    isReachable
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
      filteredTrackUids
        .map((uid) => Uid.fromString(uid).id as ID)
        .map((id) => ({
          trackId: id,
          source: playbackSource,
          uid: makeStableUid(Kind.TRACKS, id, playbackSource)
        })),
    [filteredTrackUids]
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

  const handleChangeFilterValue = useMemo(() => {
    return debounce(setFilterValue, 250)
  }, [])

  const isPending =
    lineupStatus !== Status.SUCCESS ||
    savedTracksStatus !== Status.SUCCESS ||
    isLoadingTracks

  const showTrackSkeletonList = isPending && filteredTrackUids.length === 0
  const shouldShowFilterInput =
    trackUids.length > 0 || filterValue || (isPending && saveCount > 0)

  const renderContent = () => {
    if (filteredTrackUids.length === 0 && !isPending) {
      if (!isReachable) {
        return <NoTracksPlaceholder />
      }
      if (filterValue) {
        return <EmptyTileCTA message={messages.noResultsText} />
      }
      return <EmptyTileCTA message={emptyTabText} />
    }

    return (
      <WithLoader
        loading={initialFetch && saveCount === 0 && !showTrackSkeletonList}
      >
        <Animated.View layout={Layout}>
          {showTrackSkeletonList || filteredTrackUids.length > 0 ? (
            <Tile
              styles={{
                tile:
                  showTrackSkeletonList && !shouldShowFilterInput
                    ? styles.containerWithTopSpacing
                    : styles.container
              }}
            >
              <TrackList
                style={styles.trackList}
                hideArt
                showSkeleton={showTrackSkeletonList}
                skeletonRowCount={trackSkeletonRowCount}
                hasNextPage={
                  isFetchingMore && !allTracksFetched && isReachable === true
                }
                onEndReached={handleMoreFetchSaves}
                onEndReachedThreshold={1.5}
                togglePlay={togglePlay}
                trackItemAction='overflow'
                uids={showTrackSkeletonList ? undefined : filteredTrackUids}
              />
            </Tile>
          ) : null}
        </Animated.View>
      </WithLoader>
    )
  }

  return (
    <VirtualizedScrollView>
      <>
        <OfflineContentBanner />
        {shouldShowFilterInput && (
          <FilterInput
            placeholder={messages.inputPlaceholder}
            onChangeText={handleChangeFilterValue}
          />
        )}
        {renderContent()}
      </>
    </VirtualizedScrollView>
  )
}
