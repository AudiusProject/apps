import { ComponentType, PureComponent } from 'react'

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
  LineupTrack,
  Track,
  Lineup,
  AccountCollection
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
  useLineupTable,
  AccountState
} from '@audius/common/store'
import { route } from '@audius/common/utils'
import { full } from '@audius/sdk'
import { debounce } from 'lodash'
import { connect } from 'react-redux'
import { Dispatch } from 'redux'

import { TrackEvent, make } from 'common/store/analytics/actions'
import { SsrContext } from 'ssr/SsrContext'
import { AppState } from 'store/types'
import { push } from 'utils/navigation'

import { LibraryPageProps as DesktopLibraryPageProps } from './components/desktop/LibraryPage'
import { LibraryPageProps as MobileLibraryPageProps } from './components/mobile/LibraryPage'
const { profilePage } = route
const { makeGetCurrent } = queueSelectors
const { getPlaying, getBuffering } = playerSelectors
const {
  getLibraryTracksLineup,
  hasReachedEnd,
  getTracksCategory,
  getCollectionsCategory
} = libraryPageSelectors
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

type OwnProps = {
  children:
    | ComponentType<MobileLibraryPageProps>
    | ComponentType<DesktopLibraryPageProps>
}

type LibraryPageProps = OwnProps &
  ReturnType<ReturnType<typeof makeMapStateToProps>> &
  ReturnType<typeof mapDispatchToProps> & {
    account?:
      | (AccountState & {
          playlists: AccountCollection[]
          albums: AccountCollection[]
        })
      | undefined
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

const LibraryPage = (props: LibraryPageProps) => {
  const currentTrack = useCurrentTrack()
  const tracks = useLineupTable(getLibraryTracksLineup)
  return (
    <LibraryPageClassComponent
      {...props}
      currentTrack={currentTrack}
      tracks={tracks}
    />
  )
}

class LibraryPageClassComponent extends PureComponent<
  LibraryPageProps & {
    currentTrack: Track | null
    tracks: Lineup<LibraryPageTrack>
  },
  LibraryPageState
> {
  static contextType = SsrContext
  declare context: React.ContextType<typeof SsrContext>
  state: LibraryPageState = {
    filterText: '',
    sortMethod: '',
    sortDirection: '',
    initialOrder: null,
    allTracksFetched: false,
    currentTab: ProfileTabs.TRACKS,
    shouldReturnToTrackPurchases: false
  }

  handleFetchSavedTracks = debounce(() => {
    this.props.fetchLibraryTracks(
      this.state.filterText,
      this.props.tracksCategory,
      this.state.sortMethod,
      this.state.sortDirection
    )
  }, 300)

  handleFetchMoreSavedTracks = (offset: number, limit: number) => {
    if (this.props.hasReachedEnd) return
    const { filterText, sortMethod, sortDirection } = this.state
    this.props.fetchMoreSavedTracks(
      filterText,
      this.props.tracksCategory,
      sortMethod,
      sortDirection,
      offset,
      limit
    )
  }

  componentDidMount() {
    this.props.fetchLibraryTracks(
      this.state.filterText,
      this.props.tracksCategory,
      this.state.sortMethod,
      this.state.sortDirection
    )
  }

  componentWillUnmount() {
    this.props.resetSavedTracks()
  }

  componentDidUpdate(prevProps: LibraryPageProps) {
    const { tracksCategory: prevTracksCategory } = prevProps
    const { tracks, tracksCategory } = this.props
    const hasReachedEnd = this.props.hasReachedEnd

    if (
      hasReachedEnd &&
      !this.state.allTracksFetched &&
      !this.state.filterText
    ) {
      this.setState({ allTracksFetched: true })
    } else if (!hasReachedEnd && this.state.allTracksFetched) {
      this.setState({ allTracksFetched: false })
    }

    if (!this.state.initialOrder && tracks.entries.length > 0) {
      const initialOrder = tracks.entries.map((track: any) => track.id)
      this.setState({
        initialOrder,
        reordering: initialOrder
      })
    }

    if (prevTracksCategory !== tracksCategory) {
      this.handleFetchSavedTracks()
    }
  }

  onFilterChange = (e: any) => {
    const callBack = !this.state.allTracksFetched
      ? this.handleFetchSavedTracks
      : undefined
    this.setState({ filterText: e.target.value }, callBack)
  }

  onSortChange = (method: string, direction: string) => {
    this.setState(
      { sortMethod: sortMethodMap[method] ?? '', sortDirection: direction },
      this.handleFetchSavedTracks
    )
  }

  formatMetadata = (trackMetadatas: LibraryPageTrack[]) => {
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
  }

  isQueued = () => {
    const { tracks, currentQueueItem } = this.props
    return tracks.entries.some(
      (entry: any) => currentQueueItem.uid === entry.uid
    )
  }

  getPlayingUid = () => {
    const { currentQueueItem } = this.props
    return currentQueueItem.uid
  }

  getPlayingId = () => {
    const { currentTrack } = this.props
    return currentTrack?.track_id ?? null
  }

  getFormattedData = (
    trackMetadatas: LibraryPageTrack[]
  ): [LibraryPageTrack[], number] => {
    const { tracks } = this.props
    const playingUid = this.getPlayingUid()
    const activeIndex = tracks.entries.findIndex(
      ({ uid }: any) => uid === playingUid
    )
    const filteredMetadata = this.formatMetadata(trackMetadatas)
    const filteredIndex =
      activeIndex > -1
        ? filteredMetadata.findIndex((metadata) => metadata.uid === playingUid)
        : activeIndex
    return [filteredMetadata, filteredIndex]
  }

  getFilteredData = (
    trackMetadatas: LibraryPageTrack[]
  ): [LibraryPageTrack[], number] => {
    const { tracks } = this.props
    const filterText = this.state.filterText ?? ''
    const playingUid = this.getPlayingUid()
    const activeIndex = tracks.entries.findIndex(
      ({ uid }: any) => uid === playingUid
    )
    const filteredMetadata = this.formatMetadata(trackMetadatas)
      .filter((item) => !item._marked_deleted && !item.is_delete)
      .filter(
        (item) =>
          item.title?.toLowerCase().indexOf(filterText.toLowerCase()) > -1 ||
          item.user?.name.toLowerCase().indexOf(filterText.toLowerCase()) > -1
      )
    const filteredIndex =
      activeIndex > -1
        ? filteredMetadata.findIndex((metadata) => metadata.uid === playingUid)
        : activeIndex
    return [filteredMetadata, filteredIndex]
  }

  onClickRow = (trackRecord: TrackRecord) => {
    const { playing, play, pause, record } = this.props
    const playingUid = this.getPlayingUid()
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
  }

  onTogglePlay = (uid: string, trackId: ID) => {
    const { playing, play, pause, record } = this.props
    const playingUid = this.getPlayingUid()
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
  }

  onClickTrackName = (record: TrackRecord) => {
    this.props.goToRoute(record.permalink)
  }

  onClickArtistName = (record: TrackRecord) => {
    this.props.goToRoute(profilePage(record.handle))
  }

  onClickRepost = (record: TrackRecord) => {
    if (!record.has_current_user_reposted) {
      this.props.repostTrack(record.track_id)
    } else {
      this.props.undoRepostTrack(record.track_id)
    }
  }

  onPlay = () => {
    const {
      playing,
      play,
      pause,
      tracks: { entries },
      record
    } = this.props
    const isQueued = this.isQueued()
    const playingId = this.getPlayingId()
    if (playing && isQueued) {
      pause()
      record(
        make(Name.PLAYBACK_PAUSE, {
          id: `${playingId}`,
          source: PlaybackSource.LIBRARY_PAGE
        })
      )
    } else if (!playing && isQueued) {
      play()
      record(
        make(Name.PLAYBACK_PLAY, {
          id: `${playingId}`,
          source: PlaybackSource.LIBRARY_PAGE
        })
      )
    } else if (entries.length > 0) {
      play(entries[0].uid)
      record(
        make(Name.PLAYBACK_PLAY, {
          id: `${playingId}`,
          source: PlaybackSource.LIBRARY_PAGE
        })
      )
    }
  }

  onSortTracks = (sorters: any) => {
    const { column, order } = sorters
    const {
      tracks: { entries }
    } = this.props
    // @ts-ignore
    const dataSource = this.formatMetadata(entries)
    let updatedOrder
    if (!column) {
      const trackIdMap: Record<string, LineupTrack> =
        this.props.tracks.entries.reduce(
          (acc, track) => ({
            ...acc,
            [track.track_id]: track
          }),
          {}
        )
      updatedOrder = this.state.initialOrder?.map((id) => {
        return trackIdMap[id]?.uid
      })
      this.setState({ allowReordering: true })
    } else {
      updatedOrder = dataSource
        .sort((a, b) =>
          order === 'ascend' ? column.sorter(a, b) : column.sorter(b, a)
        )
        .map((metadata) => metadata.uid)
      this.setState({ allowReordering: false })
    }
    if (updatedOrder) this.props.updateLineupOrder(updatedOrder)
  }

  onChangeTab = (tab: LibraryPageTabs) => {
    this.setState({
      currentTab: tab
    })
  }

  render() {
    const isQueued = this.isQueued()
    const playingUid = this.getPlayingUid()

    const childProps = {
      title: messages.title,
      description: messages.description,

      // State
      currentTab: this.state.currentTab,
      filterText: this.state.filterText,
      initialOrder: this.state.initialOrder,
      allTracksFetched: this.state.allTracksFetched,
      reordering: this.state.reordering,
      allowReordering: this.state.allowReordering,

      // Props from AppState
      tracks: this.props.tracks,
      currentQueueItem: this.props.currentQueueItem,
      playing: this.props.playing,
      buffering: this.props.buffering,

      // Props from dispatch
      fetchLibraryTracks: this.props.fetchLibraryTracks,
      resetSavedTracks: this.props.resetSavedTracks,
      updateLineupOrder: this.props.updateLineupOrder,
      goToRoute: this.props.goToRoute,
      play: this.props.play,
      pause: this.props.pause,
      repostTrack: this.props.repostTrack,
      undoRepostTrack: this.props.undoRepostTrack,
      saveTrack: this.props.saveTrack,
      unsaveTrack: this.props.unsaveTrack,

      // Calculated Props
      isQueued,
      playingUid,

      // Methods
      onFilterChange: this.onFilterChange,
      onSortChange: this.onSortChange,
      formatMetadata: this.formatMetadata,
      // Pass in function to allow client side filtering if all tracks have been fetched
      // Else pass in formatted data function
      getFilteredData: this.state.allTracksFetched
        ? this.getFilteredData
        : this.getFormattedData,
      onPlay: this.onPlay,
      onSortTracks: this.onSortTracks,
      onChangeTab: this.onChangeTab,
      onClickRemove: null
    }

    const mobileProps = {
      playlistUpdates: this.props.playlistUpdates,
      updatePlaylistLastViewedAt: this.props.updatePlaylistLastViewedAt,
      onTogglePlay: this.onTogglePlay
    }

    const desktopProps = {
      hasReachedEnd: this.props.hasReachedEnd,
      onClickRow: this.onClickRow,
      onClickTrackName: this.onClickTrackName,
      onClickArtistName: this.onClickArtistName,
      onClickRepost: this.onClickRepost,
      fetchMoreTracks: this.handleFetchMoreSavedTracks
    }

    return (
      // @ts-ignore
      <this.props.children {...childProps} {...mobileProps} {...desktopProps} />
    )
  }
}

function makeMapStateToProps() {
  const getCurrentQueueItem = makeGetCurrent()
  const mapStateToProps = (state: AppState) => {
    return {
      currentQueueItem: getCurrentQueueItem(state),
      playing: getPlaying(state),
      buffering: getBuffering(state),
      playlistUpdates: selectAllPlaylistUpdateIds(state),
      hasReachedEnd: hasReachedEnd(state),
      tracksCategory: getTracksCategory(state),
      collectionsCategory: getCollectionsCategory(state)
    }
  }
  return mapStateToProps
}

function mapDispatchToProps(dispatch: Dispatch) {
  return {
    fetchLibraryTracks: (
      query?: string,
      category?: LibraryCategoryType,
      sortMethod?: string,
      sortDirection?: string,
      offset?: number,
      limit?: number
    ) =>
      dispatch(
        saveActions.fetchSaves(
          query,
          category,
          sortMethod,
          sortDirection,
          offset,
          limit
        )
      ),
    fetchMoreSavedTracks: (
      query?: string,
      category?: LibraryCategoryType,
      sortMethod?: string,
      sortDirection?: string,
      offset?: number,
      limit?: number
    ) =>
      dispatch(
        saveActions.fetchMoreSaves(
          query,
          category,
          sortMethod,
          sortDirection,
          offset,
          limit
        )
      ),
    resetSavedTracks: () => dispatch(tracksActions.reset()),
    updateLineupOrder: (updatedOrderIndices: UID[]) =>
      dispatch(tracksActions.updateLineupOrder(updatedOrderIndices)),
    updatePlaylistLastViewedAt: (playlistId: number) =>
      dispatch(updatedPlaylistViewed({ playlistId })),
    goToRoute: (route: string) => dispatch(push(route)),
    play: (uid?: UID) => dispatch(tracksActions.play(uid)),
    pause: () => dispatch(tracksActions.pause()),
    repostTrack: (trackId: ID) =>
      dispatch(socialActions.repostTrack(trackId, RepostSource.LIBRARY_PAGE)),
    undoRepostTrack: (trackId: ID) =>
      dispatch(
        socialActions.undoRepostTrack(trackId, RepostSource.LIBRARY_PAGE)
      ),
    saveTrack: (trackId: ID) =>
      dispatch(socialActions.saveTrack(trackId, FavoriteSource.LIBRARY_PAGE)),
    unsaveTrack: (trackId: ID) =>
      dispatch(socialActions.unsaveTrack(trackId, FavoriteSource.LIBRARY_PAGE)),
    record: (event: TrackEvent) => dispatch(event)
  }
}
const withHook = (Component: typeof LibraryPage) => {
  return function WrappedComponent(props: LibraryPageProps) {
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

    return <Component {...props} account={account} />
  }
}

export default connect(
  makeMapStateToProps,
  mapDispatchToProps
)(withHook(LibraryPage))
