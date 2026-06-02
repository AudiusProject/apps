import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import {
  useAllPlaylistUpdateIds,
  useCurrentAccount,
  useLibraryTracks,
  useMarkPlaylistAsViewed,
  useTracks,
  useUsers,
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
  LineupTrack,
  Status
} from '@audius/common/models'
import {
  LibraryPageTabs as ProfileTabs,
  libraryPageActions as saveActions,
  libraryPageSelectors,
  LibraryCategory,
  LibraryPageTabs,
  playbackSelectors,
  tracksSocialActions as socialActions,
  playbackActions,
  LibraryPageTrack,
  TrackRecord
} from '@audius/common/store'
import type { PlaybackTrack } from '@audius/common/store'
import { dayjs, makeStableUid, route } from '@audius/common/utils'
import {
  EntityType,
  GetUserLibraryTracksSortDirectionEnum,
  GetUserLibraryTracksSortMethodEnum
} from '@audius/sdk'
import { debounce } from 'lodash'
import { useDispatch, useSelector } from 'react-redux'
import { useLocation, useNavigate, useSearchParams } from 'react-router'

import { TrackEvent, make } from 'common/store/analytics/actions'
import { push } from 'utils/navigation'

import {
  getTabFromPathname,
  getLibraryPath,
  categoryFromFilterParam,
  filterParamFromCategory,
  LIBRARY_FILTER_PARAM,
  LIBRARY_SEARCH_PARAM
} from '../lib/libraryUrl'

const { profilePage } = route
const { makeGetCurrent } = playbackSelectors
const { getPlaying, getBuffering } = playbackSelectors
const {
  getLocalTrackFavorites,
  getLocalTrackReposts,
  getLocalTrackPurchases,
  getTracksCategory,
  getCategory
} = libraryPageSelectors

const LIBRARY_TRACKS_PAGE_SIZE = 50
const FILTER_DEBOUNCE_MS = 300

const messages = {
  title: 'Library',
  description: "View tracks that you've favorited"
}

const sortMethodMap: Record<string, string> = {
  title: GetUserLibraryTracksSortMethodEnum.Title,
  artist: GetUserLibraryTracksSortMethodEnum.ArtistName,
  created_at: GetUserLibraryTracksSortMethodEnum.ReleaseDate,
  dateListened: GetUserLibraryTracksSortMethodEnum.LastListenDate,
  dateSaved: GetUserLibraryTracksSortMethodEnum.AddedDate,
  dateAdded: GetUserLibraryTracksSortMethodEnum.AddedDate,
  plays: GetUserLibraryTracksSortMethodEnum.Plays,
  repost_count: GetUserLibraryTracksSortMethodEnum.Reposts
}

const sortDirectionMap: Record<string, GetUserLibraryTracksSortDirectionEnum> =
  {
    ascend: GetUserLibraryTracksSortDirectionEnum.Asc,
    descend: GetUserLibraryTracksSortDirectionEnum.Desc
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
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const lastCategoryUrlRef = useRef<string | null>(null)

  const currentTrack = useCurrentTrack()

  const localFavorites = useSelector(getLocalTrackFavorites)
  const localReposts = useSelector(getLocalTrackReposts)
  const localPurchases = useSelector(getLocalTrackPurchases)

  const getCurrentQueueItem = makeGetCurrent()
  const currentQueueItem = useSelector(getCurrentQueueItem)
  const playing = useSelector(getPlaying)
  const buffering = useSelector(getBuffering)
  const { data: playlistUpdates = [] } = useAllPlaylistUpdateIds()
  const { mutate: markPlaylistAsViewed } = useMarkPlaylistAsViewed()
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

  const urlTab = getTabFromPathname(location.pathname)
  const urlFilter = searchParams.get(LIBRARY_FILTER_PARAM)
  const urlSearch = searchParams.get(LIBRARY_SEARCH_PARAM) ?? ''

  const [state, setState] = useState<LibraryPageState>({
    filterText: urlSearch,
    sortMethod: '',
    sortDirection: '',
    initialOrder: null,
    allTracksFetched: false,
    currentTab: urlTab,
    shouldReturnToTrackPurchases: false
  })

  // Debounced query input — drives the tan-query queryKey, so each keystroke
  // doesn't fire a new SDK request.
  const [debouncedFilterText, setDebouncedFilterText] = useState(urlSearch)
  const commitFilterText = useMemo(
    () => debounce(setDebouncedFilterText, FILTER_DEBOUNCE_MS),
    []
  )

  const selectedCategoryForUrlTab = useSelector(
    (state: Parameters<typeof getCategory>[0]) =>
      getCategory(state, { currentTab: urlTab })
  )

  // Sync from URL to state and Redux when location changes
  useEffect(() => {
    const tab = getTabFromPathname(location.pathname)
    let category = categoryFromFilterParam(urlFilter)
    if (
      tab === LibraryPageTabs.PLAYLISTS &&
      category === LibraryCategory.Purchase
    ) {
      category = LibraryCategory.All
    }
    const search = urlSearch

    lastCategoryUrlRef.current = filterParamFromCategory(category)
    setState((prev) => ({
      ...prev,
      currentTab: tab,
      filterText: search
    }))
    setDebouncedFilterText(search)
    dispatch(
      saveActions.setSelectedCategory({
        currentTab: tab,
        category
      })
    )
  }, [location.pathname, urlFilter, urlSearch, dispatch])

  // When user changes category via menu (Redux updates), sync to URL
  useEffect(() => {
    const urlCategoryParam = filterParamFromCategory(selectedCategoryForUrlTab)
    if (lastCategoryUrlRef.current === urlCategoryParam) return
    lastCategoryUrlRef.current = urlCategoryParam
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (urlCategoryParam === 'all') {
          next.delete(LIBRARY_FILTER_PARAM)
        } else {
          next.set(LIBRARY_FILTER_PARAM, urlCategoryParam)
        }
        return next
      },
      { replace: true }
    )
  }, [selectedCategoryForUrlTab, setSearchParams])

  // tan-query for the saved-tracks lineup. Replaces the legacy fetchSaves saga.
  const {
    trackIds: fetchedTrackIds,
    data: fetchedLineupData,
    isPending: isLibraryQueryPending,
    isError: isLibraryQueryError,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage
  } = useLibraryTracks({
    category: tracksCategory,
    query: debouncedFilterText,
    sortMethod: (state.sortMethod || undefined) as
      | GetUserLibraryTracksSortMethodEnum
      | undefined,
    sortDirection: sortDirectionMap[state.sortDirection],
    pageSize: LIBRARY_TRACKS_PAGE_SIZE
  })

  const fetchedTimestampById = useMemo(() => {
    const map = new Map<ID, string | undefined>()
    fetchedLineupData.forEach((d) => {
      if (d.type === EntityType.TRACK) {
        map.set(d.id as ID, d.timestamp)
      }
    })
    return map
  }, [fetchedLineupData])

  const libraryTrackIds = useMemo(() => {
    const localIds = Array.from(
      new Set([
        ...Object.keys(localFavorites).map(Number),
        ...Object.keys(localReposts).map(Number),
        ...Object.keys(localPurchases).map(Number)
      ])
    ) as ID[]
    const allIds = new Set<ID>()
    localIds.forEach((id) => allIds.add(id))
    fetchedTrackIds.forEach((id) => allIds.add(id))
    return Array.from(allIds)
  }, [fetchedTrackIds, localFavorites, localReposts, localPurchases])

  const {
    byId: libraryTracksById,
    data: libraryFetchedTracks,
    isPending: isLibraryTracksPending
  } = useTracks(libraryTrackIds, { enabled: libraryTrackIds.length > 0 })

  // `TQTrack = Omit<Track, 'user'>` so we also fetch owners and attach
  // `user` on each entry — the legacy library table reads `metadata.user.name`.
  const libraryOwnerIds = useMemo(
    () => (libraryFetchedTracks ?? []).map((t) => t.owner_id),
    [libraryFetchedTracks]
  )
  const { byId: libraryUsersById, isPending: isLibraryUsersPending } =
    useUsers(libraryOwnerIds)

  const defaultEntries = useMemo(() => {
    return libraryTrackIds
      .map((id) => {
        const track = libraryTracksById[id]
        if (!track) return null
        const user = libraryUsersById[track.owner_id]
        if (!user) return null
        const ts = fetchedTimestampById.get(id)
        const dateSaved = ts ? dayjs(ts).toISOString() : ''
        return {
          ...(track as any),
          user,
          kind: 'tracks',
          id,
          uid: makeStableUid('tracks' as any, id, 'SAVED_TRACKS'),
          dateSaved
        } as LibraryPageTrack & { uid: string }
      })
      .filter(
        (e): e is LibraryPageTrack & { uid: string; id: ID } => e !== null
      )
  }, [
    libraryTrackIds,
    libraryTracksById,
    libraryUsersById,
    fetchedTimestampById
  ])

  const hasReachedEndValue = !hasNextPage

  // State-owned sort order (UID list) for the library track table. `null`
  // means "render in the default order from saves".
  const [sortedOrder, setSortedOrder] = useState<UID[] | null>(null)

  const resetSavedTracks = useCallback(() => {
    setSortedOrder(null)
  }, [])

  const updateLineupOrder = useCallback((updatedOrderIndices: UID[]) => {
    setSortedOrder(updatedOrderIndices)
  }, [])

  const tracks = useMemo(() => {
    const status: Status = isLibraryQueryError
      ? Status.ERROR
      : isLibraryQueryPending || isLibraryTracksPending || isLibraryUsersPending
        ? Status.LOADING
        : Status.SUCCESS
    if (!sortedOrder) return { entries: defaultEntries, status }
    const byUid = new Map(defaultEntries.map((e) => [e.uid, e]))
    const ordered = sortedOrder
      .map((uid) => byUid.get(uid))
      .filter((e): e is (typeof defaultEntries)[number] => !!e)
    return {
      entries:
        ordered.length === defaultEntries.length ? ordered : defaultEntries,
      status
    }
  }, [
    defaultEntries,
    sortedOrder,
    isLibraryQueryError,
    isLibraryQueryPending,
    isLibraryTracksPending,
    isLibraryUsersPending
  ])

  const updatePlaylistLastViewedAt = useCallback(
    (playlistId: number) => {
      markPlaylistAsViewed({ playlistId })
    },
    [markPlaylistAsViewed]
  )

  const goToRoute = useCallback(
    (route: string) => {
      dispatch(push(route))
    },
    [dispatch]
  )

  // Matches legacy `libraryPageTracksLineupActions.prefix` so consumers
  // that compare against the queue source (e.g. mobile AudioPlayer offline
  // download status) keep working.
  const playbackSource = 'SAVED_TRACKS'
  const currentPlaybackTrackId = useSelector(
    playbackSelectors.getCurrentTrackId
  )

  const playbackQueue: PlaybackTrack[] = useMemo(
    () =>
      tracks.entries.map((entry: any) => ({
        trackId: entry.track_id ?? entry.id,
        source: playbackSource
      })),
    [tracks.entries]
  )

  const playTrackId = useCallback(
    (trackId: ID) => {
      if (currentPlaybackTrackId === trackId) {
        dispatch(playbackActions.play())
        return
      }
      const startIndex = playbackQueue.findIndex((t) => t.trackId === trackId)
      if (startIndex < 0) return
      dispatch(
        playbackActions.playFrom({
          tracks: playbackQueue,
          startIndex,
          querySource: null
        })
      )
    },
    [dispatch, currentPlaybackTrackId, playbackQueue]
  )

  const play = useCallback(
    (uid?: UID) => {
      if (!uid) {
        dispatch(playbackActions.play())
        return
      }
      const entry = tracks.entries.find((e: any) => e.uid === uid)
      if (!entry) return
      playTrackId(entry.track_id ?? entry.id)
    },
    [dispatch, tracks.entries, playTrackId]
  )

  const pause = useCallback(() => {
    dispatch(playbackActions.pause())
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

  const fetchMoreTracks = useCallback(() => {
    if (!hasNextPage || isFetchingNextPage) return
    fetchNextPage().catch(() => undefined)
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

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

  const updateSearchParam = useCallback(
    (search: string) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          if (search.trim() === '') {
            next.delete(LIBRARY_SEARCH_PARAM)
          } else {
            next.set(LIBRARY_SEARCH_PARAM, search)
          }
          return next
        },
        { replace: true }
      )
    },
    [setSearchParams]
  )

  const debouncedUpdateSearchParam = useMemo(
    () => debounce(updateSearchParam, 300),
    [updateSearchParam]
  )

  const onFilterChange = useCallback(
    (e: any) => {
      const value = e.target.value
      setState((prev) => ({ ...prev, filterText: value }))
      debouncedUpdateSearchParam(value)
      // Only push the filter to the server query when we don't already have
      // every row locally — mirror the saga-era behavior where complete
      // result sets get filtered client-side.
      if (!state.allTracksFetched) {
        commitFilterText(value)
      }
    },
    [state.allTracksFetched, debouncedUpdateSearchParam, commitFilterText]
  )

  const onSortChange = useCallback((method: string, direction: string) => {
    setState((prev) => ({
      ...prev,
      sortMethod: sortMethodMap[method] ?? '',
      sortDirection: direction
    }))
  }, [])

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

  const formattedEntries = useMemo(
    () => formatMetadata(tracks.entries),
    [formatMetadata, tracks.entries]
  )

  const filteredFormattedEntries = useMemo(() => {
    const filterText = (state.filterText ?? '').toLowerCase()
    return formattedEntries
      .filter((item) => !item._marked_deleted && !item.is_delete)
      .filter(
        (item) =>
          item.title?.toLowerCase().indexOf(filterText) > -1 ||
          item.user?.name.toLowerCase().indexOf(filterText) > -1
      )
  }, [formattedEntries, state.filterText])

  // The currently-playing entry's uid (as constructed locally for the
  // SAVED_TRACKS lineup), or null if a different source is playing.
  const currentPlayingUid = useMemo(() => {
    if (
      currentQueueItem.trackId == null ||
      currentQueueItem.source !== playbackSource
    ) {
      return null
    }
    return makeStableUid(
      'tracks' as any,
      currentQueueItem.trackId,
      playbackSource
    )
  }, [currentQueueItem.trackId, currentQueueItem.source])

  const isQueued = useCallback(() => {
    return tracks.entries.some((entry: any) => currentPlayingUid === entry.uid)
  }, [tracks.entries, currentPlayingUid])

  const getPlayingUid = useCallback(() => {
    return currentPlayingUid
  }, [currentPlayingUid])

  const getPlayingId = useCallback(() => {
    return currentTrack?.track_id ?? null
  }, [currentTrack])

  const getFormattedData = useCallback(
    (trackMetadatas: LibraryPageTrack[]): [LibraryPageTrack[], number] => {
      const playingUid = getPlayingUid()
      const filteredMetadata =
        trackMetadatas === tracks.entries
          ? formattedEntries
          : formatMetadata(trackMetadatas)
      const filteredIndex = playingUid
        ? filteredMetadata.findIndex((metadata) => metadata.uid === playingUid)
        : -1
      return [filteredMetadata, filteredIndex]
    },
    [getPlayingUid, tracks.entries, formattedEntries, formatMetadata]
  )

  const getFilteredData = useCallback(
    (trackMetadatas: LibraryPageTrack[]): [LibraryPageTrack[], number] => {
      const playingUid = getPlayingUid()
      const filterText = (state.filterText ?? '').toLowerCase()
      const filteredMetadata =
        trackMetadatas === tracks.entries
          ? filteredFormattedEntries
          : formatMetadata(trackMetadatas)
              .filter((item) => !item._marked_deleted && !item.is_delete)
              .filter(
                (item) =>
                  item.title?.toLowerCase().indexOf(filterText) > -1 ||
                  item.user?.name.toLowerCase().indexOf(filterText) > -1
              )
      const filteredIndex = playingUid
        ? filteredMetadata.findIndex((metadata) => metadata.uid === playingUid)
        : -1
      return [filteredMetadata, filteredIndex]
    },
    [
      state.filterText,
      getPlayingUid,
      tracks.entries,
      filteredFormattedEntries,
      formatMetadata
    ]
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

  const onChangeTab = useCallback(
    (tab: LibraryPageTabs) => {
      setState((prev) => ({ ...prev, currentTab: tab }))
      const path = getLibraryPath(tab)
      const search = searchParams.toString()
      navigate(search ? `${path}?${search}` : path)
    },
    [navigate, searchParams]
  )

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
    fetchLibraryTracks: () => {},
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
    fetchMoreTracks,

    // Additional props
    hasReachedEnd: hasReachedEndValue,
    playlistUpdates: playlistUpdates as number[],
    updatePlaylistLastViewedAt,
    account
  }
}
