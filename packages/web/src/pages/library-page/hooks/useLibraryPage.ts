import { useCallback, useEffect, useMemo, useState } from 'react'

import {
  useCurrentAccount,
  selectNameSortedPlaylistsAndAlbums
} from '@audius/common/api'
import { useCurrentTrack } from '@audius/common/hooks'
import {
  Name,
  RepostSource,
  FavoriteSource,
  PlaybackSource,
  ID,
  UID,
  LineupTrack
} from '@audius/common/models'
import {
  LibraryPageTabs as ProfileTabs,
  libraryPageTracksLineupActions as tracksActions,
  libraryPageActions as saveActions,
  libraryPageSelectors,
  LibraryPageTabs,
  queueSelectors,
  tracksSocialActions as socialActions,
  playerSelectors,
  playlistUpdatesActions,
  playlistUpdatesSelectors,
  LibraryCategoryType,
  LibraryPageTrack,
  TrackRecord,
  useLineupTable
} from '@audius/common/store'
import { route } from '@audius/common/utils'
import { full } from '@audius/sdk'
import { debounce } from 'lodash'
import { useDispatch, useSelector } from 'react-redux'

import { TrackEvent, make } from 'common/store/analytics/actions'
import { push } from 'utils/navigation'

const { profilePage } = route
const { makeGetCurrent } = queueSelectors
const { getPlaying, getBuffering } = playerSelectors
const { getLibraryTracksLineup, hasReachedEnd, getTracksCategory } =
  libraryPageSelectors
const { updatedPlaylistViewed } = playlistUpdatesActions

const { selectAllPlaylistUpdateIds } = playlistUpdatesSelectors

const messages = {
  title: 'Library',
  description: "View tracks that you've favorited"
}

const { GetFavoritesSortMethodEnum } = full

const sortMethodMap: Record<string, string> = {
  title: GetFavoritesSortMethodEnum.Title,
  artist: GetFavoritesSortMethodEnum.ArtistName,
  created_at: GetFavoritesSortMethodEnum.ReleaseDate,
  dateListened: GetFavoritesSortMethodEnum.LastListenDate,
  dateSaved: GetFavoritesSortMethodEnum.AddedDate,
  dateAdded: GetFavoritesSortMethodEnum.AddedDate,
  plays: GetFavoritesSortMethodEnum.Plays,
  repost_count: GetFavoritesSortMethodEnum.Reposts
}

type LibraryPageState = {
  currentTab: ProfileTabs
  filterText: string
  sortMethod: string
  sortDirection: string
  allTracksFetched: boolean
  initialOrder: UID[] | null
  reordering?: UID[] | null
  allowReordering?: boolean
  shouldReturnToTrackPurchases: boolean
}

export const useLibraryPage = () => {
  const dispatch = useDispatch()
  const currentTrack = useCurrentTrack()
  const tracks = useLineupTable(getLibraryTracksLineup)

  const getCurrentQueueItem = makeGetCurrent()
  const currentQueueItem = useSelector(getCurrentQueueItem)
  const playing = useSelector(getPlaying)
  const buffering = useSelector(getBuffering)
  const playlistUpdates = useSelector(selectAllPlaylistUpdateIds)
  const hasReachedEndValue = useSelector(hasReachedEnd)
  const tracksCategory = useSelector(getTracksCategory)

  const { data: account } = useCurrentAccount({
    select: (account) => {
      if (!account) return undefined
      const sortedCollections = selectNameSortedPlaylistsAndAlbums(account)
      if (!sortedCollections) return undefined
      return {
        ...account,
        playlists: sortedCollections.playlists ?? [],
        albums: sortedCollections.albums ?? []
      }
    }
  })

  const [state, setState] = useState<LibraryPageState>({
    filterText: '',
    sortMethod: '',
    sortDirection: '',
    initialOrder: null,
    allTracksFetched: false,
    currentTab: ProfileTabs.TRACKS,
    shouldReturnToTrackPurchases: false
  })

  const fetchLibraryTracks = useCallback(
    (
      query?: string,
      category?: LibraryCategoryType,
      sortMethod?: string,
      sortDirection?: string,
      offset?: number,
      limit?: number
    ) => {
      dispatch(
        saveActions.fetchSaves(
          query,
          category,
          sortMethod,
          sortDirection,
          offset,
          limit
        )
      )
    },
    [dispatch]
  )

  const fetchMoreSavedTracks = useCallback(
    (
      query?: string,
      category?: LibraryCategoryType,
      sortMethod?: string,
      sortDirection?: string,
      offset?: number,
      limit?: number
    ) => {
      dispatch(
        saveActions.fetchMoreSaves(
          query,
          category,
          sortMethod,
          sortDirection,
          offset,
          limit
        )
      )
    },
    [dispatch]
  )

  const resetSavedTracks = useCallback(() => {
    dispatch(tracksActions.reset())
  }, [dispatch])

  const updateLineupOrder = useCallback(
    (updatedOrderIndices: UID[]) => {
      dispatch(tracksActions.updateLineupOrder(updatedOrderIndices))
    },
    [dispatch]
  )

  const updatePlaylistLastViewedAt = useCallback(
    (playlistId: number) => {
      dispatch(updatedPlaylistViewed({ playlistId }))
    },
    [dispatch]
  )

  const goToRoute = useCallback(
    (route: string) => {
      dispatch(push(route))
    },
    [dispatch]
  )

  const play = useCallback(
    (uid?: UID) => {
      dispatch(tracksActions.play(uid))
    },
    [dispatch]
  )

  const pause = useCallback(() => {
    dispatch(tracksActions.pause())
  }, [dispatch])

  const repostTrack = useCallback(
    (trackId: ID) => {
      dispatch(socialActions.repostTrack(trackId, RepostSource.LIBRARY_PAGE))
    },
    [dispatch]
  )

  const undoRepostTrack = useCallback(
    (trackId: ID) => {
      dispatch(
        socialActions.undoRepostTrack(trackId, RepostSource.LIBRARY_PAGE)
      )
    },
    [dispatch]
  )

  const saveTrack = useCallback(
    (trackId: ID) => {
      dispatch(socialActions.saveTrack(trackId, FavoriteSource.LIBRARY_PAGE))
    },
    [dispatch]
  )

  const unsaveTrack = useCallback(
    (trackId: ID) => {
      dispatch(socialActions.unsaveTrack(trackId, FavoriteSource.LIBRARY_PAGE))
    },
    [dispatch]
  )

  const record = useCallback(
    (event: TrackEvent) => {
      dispatch(event)
    },
    [dispatch]
  )

  const handleFetchSavedTracks = useMemo(
    () =>
      debounce(() => {
        fetchLibraryTracks(
          state.filterText,
          tracksCategory,
          state.sortMethod,
          state.sortDirection
        )
      }, 300),
    [
      state.filterText,
      state.sortMethod,
      state.sortDirection,
      tracksCategory,
      fetchLibraryTracks
    ]
  )

  const handleFetchMoreSavedTracks = useCallback(
    (offset: number, limit: number) => {
      if (hasReachedEndValue) return
      fetchMoreSavedTracks(
        state.filterText,
        tracksCategory,
        state.sortMethod,
        state.sortDirection,
        offset,
        limit
      )
    },
    [
      hasReachedEndValue,
      state.filterText,
      state.sortMethod,
      state.sortDirection,
      tracksCategory,
      fetchMoreSavedTracks
    ]
  )

  useEffect(() => {
    fetchLibraryTracks(
      state.filterText,
      tracksCategory,
      state.sortMethod,
      state.sortDirection
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run on mount

  useEffect(() => {
    return () => {
      resetSavedTracks()
    }
  }, [resetSavedTracks])

  useEffect(() => {
    if (hasReachedEndValue && !state.allTracksFetched && !state.filterText) {
      setState((prev) => ({ ...prev, allTracksFetched: true }))
    } else if (!hasReachedEndValue && state.allTracksFetched) {
      setState((prev) => ({ ...prev, allTracksFetched: false }))
    }
  }, [hasReachedEndValue, state.allTracksFetched, state.filterText])

  useEffect(() => {
    if (!state.initialOrder && tracks.entries.length > 0) {
      const initialOrder = tracks.entries.map((track: any) => track.id)
      setState((prev) => ({
        ...prev,
        initialOrder,
        reordering: initialOrder
      }))
    }
  }, [state.initialOrder, tracks.entries])

  useEffect(() => {
    handleFetchSavedTracks()
  }, [tracksCategory, handleFetchSavedTracks])

  const onFilterChange = useCallback(
    (e: any) => {
      const callBack = !state.allTracksFetched
        ? handleFetchSavedTracks
        : undefined
      setState((prev) => ({ ...prev, filterText: e.target.value }))
      if (callBack) {
        callBack()
      }
    },
    [state.allTracksFetched, handleFetchSavedTracks]
  )

  const onSortChange = useCallback(
    (method: string, direction: string) => {
      setState((prev) => ({
        ...prev,
        sortMethod: sortMethodMap[method] ?? '',
        sortDirection: direction
      }))
      handleFetchSavedTracks()
    },
    [handleFetchSavedTracks]
  )

  const formatMetadata = useCallback((trackMetadatas: LibraryPageTrack[]) => {
    return trackMetadatas.map((entry, i) => ({
      ...entry,
      key: `${entry.title}_${entry.uid}_${i}`,
      name: entry.title,
      artist: entry.user?.name ?? '',
      handle: entry.user?.handle ?? '',
      date: entry.dateSaved,
      time: entry.duration,
      plays: entry.play_count
    }))
  }, [])

  const isQueued = useCallback(() => {
    return tracks.entries.some(
      (entry: any) => currentQueueItem.uid === entry.uid
    )
  }, [tracks.entries, currentQueueItem.uid])

  const getPlayingUid = useCallback(() => {
    return currentQueueItem.uid
  }, [currentQueueItem.uid])

  const getPlayingId = useCallback(() => {
    return currentTrack?.track_id ?? null
  }, [currentTrack])

  const getFormattedData = useCallback(
    (trackMetadatas: LibraryPageTrack[]): [LibraryPageTrack[], number] => {
      const playingUid = getPlayingUid()
      const activeIndex = tracks.entries.findIndex(
        ({ uid }: any) => uid === playingUid
      )
      const filteredMetadata = formatMetadata(trackMetadatas)
      const filteredIndex =
        activeIndex > -1
          ? filteredMetadata.findIndex(
              (metadata) => metadata.uid === playingUid
            )
          : activeIndex
      return [filteredMetadata, filteredIndex]
    },
    [getPlayingUid, tracks.entries, formatMetadata]
  )

  const getFilteredData = useCallback(
    (trackMetadatas: LibraryPageTrack[]): [LibraryPageTrack[], number] => {
      const filterText = state.filterText ?? ''
      const playingUid = getPlayingUid()
      const activeIndex = tracks.entries.findIndex(
        ({ uid }: any) => uid === playingUid
      )
      const filteredMetadata = formatMetadata(trackMetadatas)
        .filter((item) => !item._marked_deleted && !item.is_delete)
        .filter(
          (item) =>
            item.title?.toLowerCase().indexOf(filterText.toLowerCase()) > -1 ||
            item.user?.name.toLowerCase().indexOf(filterText.toLowerCase()) > -1
        )
      const filteredIndex =
        activeIndex > -1
          ? filteredMetadata.findIndex(
              (metadata) => metadata.uid === playingUid
            )
          : activeIndex
      return [filteredMetadata, filteredIndex]
    },
    [state.filterText, getPlayingUid, tracks.entries, formatMetadata]
  )

  const onClickRow = useCallback(
    (trackRecord: TrackRecord) => {
      const playingUid = getPlayingUid()
      if (playing && playingUid === trackRecord.uid) {
        pause()
        record(
          make(Name.PLAYBACK_PAUSE, {
            id: `${trackRecord.track_id}`,
            source: PlaybackSource.LIBRARY_PAGE
          })
        )
      } else if (playingUid !== trackRecord.uid) {
        play(trackRecord.uid)
        record(
          make(Name.PLAYBACK_PLAY, {
            id: `${trackRecord.track_id}`,
            source: PlaybackSource.LIBRARY_PAGE
          })
        )
      } else {
        play()
        record(
          make(Name.PLAYBACK_PLAY, {
            id: `${trackRecord.track_id}`,
            source: PlaybackSource.LIBRARY_PAGE
          })
        )
      }
    },
    [playing, getPlayingUid, pause, play, record]
  )

  const onTogglePlay = useCallback(
    (uid: string, trackId: ID) => {
      const playingUid = getPlayingUid()
      if (playing && playingUid === uid) {
        pause()
        record(
          make(Name.PLAYBACK_PAUSE, {
            id: `${trackId}`,
            source: PlaybackSource.LIBRARY_PAGE
          })
        )
      } else if (playingUid !== uid) {
        play(uid)
        record(
          make(Name.PLAYBACK_PLAY, {
            id: `${trackId}`,
            source: PlaybackSource.LIBRARY_PAGE
          })
        )
      } else {
        play()
        record(
          make(Name.PLAYBACK_PLAY, {
            id: `${trackId}`,
            source: PlaybackSource.LIBRARY_PAGE
          })
        )
      }
    },
    [playing, getPlayingUid, pause, play, record]
  )

  const onClickTrackName = useCallback(
    (record: TrackRecord) => {
      goToRoute(record.permalink)
    },
    [goToRoute]
  )

  const onClickArtistName = useCallback(
    (record: TrackRecord) => {
      goToRoute(profilePage(record.handle))
    },
    [goToRoute]
  )

  const onClickRepost = useCallback(
    (record: TrackRecord) => {
      if (!record.has_current_user_reposted) {
        repostTrack(record.track_id)
      } else {
        undoRepostTrack(record.track_id)
      }
    },
    [repostTrack, undoRepostTrack]
  )

  const onPlay = useCallback(() => {
    const isQueuedValue = isQueued()
    const playingId = getPlayingId()
    if (playing && isQueuedValue) {
      pause()
      record(
        make(Name.PLAYBACK_PAUSE, {
          id: `${playingId}`,
          source: PlaybackSource.LIBRARY_PAGE
        })
      )
    } else if (!playing && isQueuedValue) {
      play()
      record(
        make(Name.PLAYBACK_PLAY, {
          id: `${playingId}`,
          source: PlaybackSource.LIBRARY_PAGE
        })
      )
    } else if (tracks.entries.length > 0) {
      play(tracks.entries[0].uid)
      record(
        make(Name.PLAYBACK_PLAY, {
          id: `${playingId}`,
          source: PlaybackSource.LIBRARY_PAGE
        })
      )
    }
  }, [playing, isQueued, getPlayingId, pause, play, record, tracks.entries])

  const onSortTracks = useCallback(
    (sorters: any) => {
      const { column, order } = sorters
      const dataSource = formatMetadata(tracks.entries)
      let updatedOrder
      if (!column) {
        const trackIdMap: Record<string, LineupTrack> = tracks.entries.reduce(
          (acc, track) => ({
            ...acc,
            [track.track_id]: track
          }),
          {}
        )
        updatedOrder = state.initialOrder?.map((id) => {
          return trackIdMap[id]?.uid
        })
        setState((prev) => ({ ...prev, allowReordering: true }))
      } else {
        updatedOrder = dataSource
          .sort((a, b) =>
            order === 'ascend' ? column.sorter(a, b) : column.sorter(b, a)
          )
          .map((metadata) => metadata.uid)
        setState((prev) => ({ ...prev, allowReordering: false }))
      }
      if (updatedOrder) updateLineupOrder(updatedOrder)
    },
    [formatMetadata, tracks.entries, state.initialOrder, updateLineupOrder]
  )

  const onChangeTab = useCallback((tab: LibraryPageTabs) => {
    setState((prev) => ({ ...prev, currentTab: tab }))
  }, [])

  const isQueuedValue = isQueued()
  const playingUid = getPlayingUid()

  return {
    // Messages
    title: messages.title,
    description: messages.description,

    // State
    currentTab: state.currentTab,
    filterText: state.filterText,
    initialOrder: state.initialOrder,
    allTracksFetched: state.allTracksFetched,
    reordering: state.reordering,
    allowReordering: state.allowReordering,

    // Props from AppState
    tracks,
    currentQueueItem,
    playing,
    buffering,

    // Props from dispatch
    fetchLibraryTracks: () =>
      fetchLibraryTracks(
        state.filterText,
        tracksCategory,
        state.sortMethod,
        state.sortDirection
      ),
    resetSavedTracks,
    updateLineupOrder,
    goToRoute,
    play,
    pause,
    repostTrack,
    undoRepostTrack,
    saveTrack,
    unsaveTrack,

    // Calculated Props
    isQueued: isQueuedValue,
    playingUid,

    // Methods
    onFilterChange,
    onSortChange,
    formatMetadata,
    getFilteredData: state.allTracksFetched
      ? getFilteredData
      : getFormattedData,
    onPlay,
    onSortTracks,
    onChangeTab,
    onClickRow,
    onClickTrackName,
    onClickArtistName,
    onClickRepost,
    onTogglePlay,
    fetchMoreTracks: handleFetchMoreSavedTracks,

    // Additional props
    hasReachedEnd: hasReachedEndValue,
    playlistUpdates: playlistUpdates as number[],
    updatePlaylistLastViewedAt,
    account
  }
}
