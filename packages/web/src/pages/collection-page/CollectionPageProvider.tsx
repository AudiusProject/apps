import { ChangeEvent, Component, ComponentProps, ComponentType } from 'react'

import {
  useCollectionByParams,
  useUser,
  useCurrentUserId
} from '@audius/common/api'
import { useCurrentTrack } from '@audius/common/hooks'
import {
  Name,
  ShareSource,
  RepostSource,
  FavoriteSource,
  FollowSource,
  PlaybackSource,
  FavoriteType,
  PlayableType,
  Kind,
  Status,
  Collection,
  ID,
  UID,
  isContentUSDCPurchaseGated,
  ModalSource,
  Track,
  AccountCollection,
  User
} from '@audius/common/models'
import {
  cacheCollectionsActions,
  lineupSelectors,
  collectionPageLineupActions as tracksActions,
  collectionPageSelectors,
  collectionPageActions as collectionActions,
  queueSelectors,
  collectionsSocialActions as socialCollectionsActions,
  tracksSocialActions as socialTracksActions,
  usersSocialActions as socialUsersActions,
  mobileOverflowMenuUIActions,
  modalsActions,
  shareModalUIActions,
  OverflowAction,
  OverflowSource,
  repostsUserListActions,
  favoritesUserListActions,
  RepostType,
  playerSelectors,
  playlistUpdatesActions,
  playlistUpdatesSelectors,
  CollectionTrack,
  CollectionsPageType,
  CollectionPageTrackRecord,
  PurchaseableContentType,
  usePremiumContentPurchaseModalActions,
  PremiumContentPurchaseModalState,
  albumTrackRemoveConfirmationModalActions,
  AlbumTrackRemoveConfirmationModalState,
  PlayerBehavior,
  playerActions,
  useLineupTable
} from '@audius/common/store'
import { formatUrlName, Uid, Nullable, route } from '@audius/common/utils'
import { UnregisterCallback } from 'history'
import { connect } from 'react-redux'
import { useLocation } from 'react-router-dom'
import { Dispatch } from 'redux'

import { useHistoryContext } from 'app/HistoryProvider'
import { TrackEvent, make } from 'common/store/analytics/actions'
import DeletedPage from 'pages/deleted-page/DeletedPage'
import {
  setUsers,
  setVisibility
} from 'store/application/ui/userListModal/slice'
import {
  UserListType,
  UserListEntityType
} from 'store/application/ui/userListModal/types'
import { getLocationPathname } from 'store/routing/selectors'
import { AppState } from 'store/types'
import { push, replace } from 'utils/navigation'
import { getPathname } from 'utils/route'
import { parseCollectionRoute } from 'utils/route/collectionRouteParser'
import { getCollectionPageSEOFields } from 'utils/seo'

import { CollectionPageProps as DesktopCollectionPageProps } from './components/desktop/CollectionPage'
import { CollectionPageProps as MobileCollectionPageProps } from './components/mobile/CollectionPage'

const {
  profilePage,
  collectionPage,
  NOT_FOUND_PAGE,
  REPOSTING_USERS_ROUTE,
  FAVORITING_USERS_ROUTE
} = route
const { trackModalOpened } = modalsActions
const { selectAllPlaylistUpdateIds } = playlistUpdatesSelectors
const { makeGetCurrent, getPlayerBehavior } = queueSelectors
const { getPlaying, getBuffering } = playerSelectors
const { setFavorite } = favoritesUserListActions
const { setRepost } = repostsUserListActions
const { requestOpen: requestOpenShareModal } = shareModalUIActions
const { open } = mobileOverflowMenuUIActions
const { getCollectionTracksLineup, getUserUid, getCollectionPermalink } =
  collectionPageSelectors
const { updatedPlaylistViewed } = playlistUpdatesActions
const { makeGetLineupOrder } = lineupSelectors
const {
  editPlaylist,
  removeTrackFromPlaylist,
  orderPlaylist,
  publishPlaylist
} = cacheCollectionsActions

type OwnProps = {
  type: CollectionsPageType
  isMobile: boolean
  children:
    | ComponentType<MobileCollectionPageProps>
    | ComponentType<DesktopCollectionPageProps>

  // Smart collection props
}

type CollectionPageProps = OwnProps &
  ReturnType<ReturnType<typeof makeMapStateToProps>> &
  ReturnType<typeof mapDispatchToProps> & {
    location: ReturnType<typeof useLocation>
    history: ReturnType<typeof useHistoryContext>['history']
    userId?: number | null | undefined
    userPlaylists?: AccountCollection[] | undefined
    user?: User | undefined
  }

type CollectionClassProps = CollectionPageProps & {
  collection: Collection
  currentTrack: Track | null
  tracks: {
    status: Status
    entries: CollectionTrack[]
  }
  trackCount: number
  playlistId: number
}

type CollectionPageState = {
  filterText: string
  initialOrder: string[] | null
  playlistId: number | null
  reordering: string[] | null
  allowReordering: boolean
  updatingRoute: boolean
}

type PlaylistTrack = { time: number; track: ID; uid?: UID }

const CollectionPage = (props: CollectionPageProps) => {
  const { location } = props
  const pathname = getPathname(location)
  const params = parseCollectionRoute(pathname)
  const { data: collection } = useCollectionByParams(params)
  const { data: user } = useUser(collection?.playlist_owner_id)
  const { data: currentUserId } = useCurrentUserId()
  const trackCount = collection?.playlist_contents.track_ids.length ?? 0
  const playlistId = collection?.playlist_id
  const currentTrack = useCurrentTrack()
  const tracks = useLineupTable(getCollectionTracksLineup)

  if (!collection) return null

  return (
    <CollectionPageClassComponent
      {...props}
      collection={collection!}
      playlistId={playlistId!}
      tracks={tracks}
      trackCount={trackCount}
      currentTrack={currentTrack}
      userId={currentUserId}
      user={user}
    />
  )
}

class CollectionPageClassComponent extends Component<
  CollectionClassProps,
  CollectionPageState
> {
  state: CollectionPageState = {
    filterText: '',
    initialOrder: null,
    playlistId: null,
    // For drag + drop reordering
    reordering: null,
    allowReordering: true,

    // Whether the collection is updating its own route.
    // When a user creates a playlist, we eagerly cache it with a fake uid.
    // When the collection is available, a new cache entry is added with the actual id and
    // the existing collection is marked as moved, triggering this component to re-route if rendered.
    updatingRoute: false
  }

  unlisten!: UnregisterCallback

  componentDidMount() {
    this.fetchCollection(getPathname(this.props.location), true)
    this.unlisten = this.props.history.listen((location, action) => {
      if (
        action !== 'REPLACE' &&
        getPathname(this.props.location) !== getPathname(location)
      ) {
        // If the action is not replace (e.g. we are not trying to update
        // the URL for the same playlist. Reset it.)
        this.resetCollection()
      }
      this.fetchCollection(getPathname(location), true)
      this.setState({
        initialOrder: null,
        reordering: null
      })
    })
  }

  componentDidUpdate(prevProps: CollectionClassProps) {
    const {
      collection: metadata,
      userUid,
      status,
      user,
      tracks,
      pathname,
      fetchCollectionSucceeded,
      type,
      playlistUpdates,
      updatePlaylistLastViewedAt
    } = this.props

    if (
      type === 'playlist' &&
      this.props.playlistId &&
      playlistUpdates.includes(this.props.playlistId)
    ) {
      updatePlaylistLastViewedAt(this.props.playlistId)
    }

    const { updatingRoute, initialOrder } = this.state

    // Reset the initial order if it is unset OR
    // if the uids of the tracks in the lineup are changing with this
    // update (initialOrder should contain ALL of the uids, so it suffices to check the first one).
    const newInitialOrder = tracks.entries.map((track) => track.uid)

    const noInitialOrder = !initialOrder && tracks.entries.length > 0
    const prevEntryIds = new Set(initialOrder)
    const newUids =
      Array.isArray(initialOrder) &&
      initialOrder.length > 0 &&
      newInitialOrder.length > 0 &&
      !newInitialOrder.every((id) => prevEntryIds.has(id))

    if (noInitialOrder || newUids) {
      this.setState({
        initialOrder: newInitialOrder,
        reordering: newInitialOrder
      })
    }

    const params = parseCollectionRoute(pathname)

    if (!params) return
    if (status === Status.ERROR) {
      if (
        params &&
        params.collectionId === this.props.playlistId &&
        metadata?.playlist_owner_id !== this.props.userId
      ) {
        // Only route to not found page if still on the collection page and
        // it is erroring on the correct playlistId
        // and it's not our playlist
        this.props.goToRoute(NOT_FOUND_PAGE)
      }
      return
    }

    // Redirect to user tombstone if creator deactivated their account
    if (user && user.is_deactivated) {
      this.props.goToRoute(profilePage(user.handle))
      return
    }

    // Check if the collection has moved in the cache and redirect as needed.
    if (metadata && metadata._moved && !updatingRoute) {
      this.setState({ updatingRoute: true })
      const collectionId = Uid.fromString(metadata._moved).id as number
      fetchCollectionSucceeded(collectionId, metadata.permalink || '', userUid)
      const newPath = pathname.replace(
        `${metadata.playlist_id}`,
        collectionId.toString()
      )
      this.setState(
        {
          playlistId: collectionId,
          initialOrder: null,
          reordering: null
        },
        () => {
          this.props.replaceRoute(newPath)
        }
      )
    }
    if (metadata && !metadata._moved && updatingRoute) {
      this.setState({ updatingRoute: false })
    }

    const { collection: prevMetadata } = prevProps
    if (metadata) {
      const params = parseCollectionRoute(pathname)
      if (params) {
        const { collectionId, title, collectionType, handle, permalink } =
          params
        const newCollectionName = formatUrlName(metadata.playlist_name)

        const routeLacksCollectionInfo =
          (title === null || handle === null || collectionType === null) &&
          permalink == null &&
          user
        if (routeLacksCollectionInfo) {
          // Check if we are coming from a non-canonical route and replace route if necessary.
          const newPath = collectionPage(
            user!.handle,
            metadata.playlist_name,
            collectionId,
            metadata.permalink,
            metadata.is_album
          )
          this.props.replaceRoute(newPath)
        } else {
          // Id matches or temp id matches
          const idMatches =
            collectionId === metadata.playlist_id ||
            (metadata._temp && `${collectionId}` === `${metadata.playlist_id}`)
          // Check that the playlist name hasn't changed. If so, update url.
          if (idMatches && title) {
            if (newCollectionName !== title) {
              const newPath = pathname.replace(title, newCollectionName)
              this.props.replaceRoute(newPath)
            }
          }
        }
      }
    }

    const currentTrackCount = this.props.trackCount
    const previousTrackCount = prevProps.trackCount

    // Refetch tracks if a track has been added to collection
    if (currentTrackCount > previousTrackCount) {
      this.props.fetchTracks()
    }

    // check that the collection content hasn't changed
    if (
      metadata &&
      prevMetadata &&
      !this.playListContentsEqual(
        metadata.playlist_contents.track_ids,
        prevMetadata.playlist_contents.track_ids
      )
    ) {
      this.props.fetchTracks()
    }
  }

  componentWillUnmount() {
    if (this.unlisten) this.unlisten()
    // On mobile, because the transitioning-out collection page unmounts
    // after the transitioning-in collection page mounts, we do not want to reset
    // the collection in unmount. That would end up clearing the content AFTER
    // new content is loaded.
    if (!this.props.isMobile) {
      this.resetCollection()
    }
  }

  playListContentsEqual(
    prevPlaylistContents: PlaylistTrack[],
    curPlaylistContents: PlaylistTrack[]
  ) {
    return (
      prevPlaylistContents.length === curPlaylistContents.length &&
      prevPlaylistContents.reduce(
        (acc, cur, idx) => acc && cur.track === curPlaylistContents[idx].track,
        true
      )
    )
  }

  maybeParseInt = (s: string) => {
    const i = parseInt(s, 10)
    if (i.toString() === s) return i
    return s
  }

  fetchCollection = (pathname: string, fetchLineup = false) => {
    const { fetchCollection } = this.props
    const params = parseCollectionRoute(pathname)
    if (!params) return

    const { permalink, collectionId } = params

    // Need typecast as can't set type via redux-first-history, see https://github.com/reach/router/issues/414
    const locationState = this.props.location.state as { forceFetch?: boolean }
    const forceFetch = locationState?.forceFetch

    if (forceFetch || permalink || collectionId !== this.state.playlistId) {
      this.setState({ playlistId: collectionId as number })
      fetchCollection({
        id: collectionId,
        permalink,
        fetchLineup,
        forceFetch
      })
    }
  }

  resetCollection = () => {
    this.props.resetCollection()
  }

  refreshCollection = () => {
    this.fetchCollection(getPathname(this.props.location), true)
  }

  onFilterChange = (e: ChangeEvent<HTMLInputElement>) => {
    this.setState({ filterText: e.target.value })
  }

  isQueued = () => {
    const { tracks, currentQueueItem } = this.props
    return tracks.entries.some((entry) => currentQueueItem.uid === entry.uid)
  }

  getPlayingUid = () => {
    const { currentQueueItem } = this.props
    return currentQueueItem.uid
  }

  getPlayingId = () => {
    const { currentTrack } = this.props
    return currentTrack?.track_id ?? null
  }

  formatMetadata = (
    trackMetadatas: CollectionTrack[]
  ): CollectionPageTrackRecord[] => {
    return trackMetadatas.map((metadata, i) => ({
      ...metadata,
      key: `${metadata.title}_${metadata.uid}_${i}`,
      name: metadata.title,
      artist: metadata.user.name,
      handle: metadata.user.handle,
      date: metadata.dateAdded || metadata.created_at,
      time: metadata.duration,
      // for hidden tracks, we don't show the play_count and represent this
      // as -1 for sorting. The tracks-table will render this as a dash.
      plays:
        metadata.is_unlisted && this.props.userId !== metadata.owner_id
          ? -1
          : metadata.play_count
    }))
  }

  getFilteredData = (trackMetadatas: CollectionTrack[]) => {
    const filterText = this.state.filterText
    const { tracks } = this.props
    const playingUid = this.getPlayingUid()
    const activeIndex = tracks.entries.findIndex(
      ({ uid }) => uid === playingUid
    )
    const filteredMetadata = this.formatMetadata(trackMetadatas).filter(
      (item) =>
        item.title.toLowerCase().indexOf(filterText.toLowerCase()) > -1 ||
        item.user.name.toLowerCase().indexOf(filterText.toLowerCase()) > -1
    )
    const filteredIndex =
      activeIndex > -1
        ? filteredMetadata.findIndex((metadata) => metadata.uid === playingUid)
        : activeIndex
    return [filteredMetadata, filteredIndex] as [
      typeof filteredMetadata,
      number
    ]
  }

  onClickRow = (trackRecord: CollectionPageTrackRecord) => {
    const { playing, play, pause, record } = this.props
    const playingUid = this.getPlayingUid()
    if (playing && playingUid === trackRecord.uid) {
      pause()
      record(
        make(Name.PLAYBACK_PAUSE, {
          id: `${trackRecord.track_id}`,
          source: PlaybackSource.PLAYLIST_TRACK
        })
      )
    } else if (playingUid !== trackRecord.uid) {
      play(trackRecord.uid)
      record(
        make(Name.PLAYBACK_PLAY, {
          id: `${trackRecord.track_id}`,
          source: PlaybackSource.PLAYLIST_TRACK
        })
      )
    } else {
      play()
      record(
        make(Name.PLAYBACK_PLAY, {
          id: `${trackRecord.track_id}`,
          source: PlaybackSource.PLAYLIST_TRACK
        })
      )
    }
  }

  onClickRepostTrack = (record: CollectionPageTrackRecord) => {
    if (!record.has_current_user_reposted) {
      this.props.repostTrack(record.track_id)
    } else {
      this.props.undoRepostTrack(record.track_id)
    }
  }

  onClickPurchaseTrack = (record: CollectionPageTrackRecord) => {
    this.props.openPremiumContentPurchaseModal({
      contentId: record.track_id,
      contentType: PurchaseableContentType.TRACK,
      source: ModalSource.TrackListItem
    })
  }

  onClickRemove = (
    trackId: number,
    _index: number,
    uid: string,
    timestamp: number
  ) => {
    const {
      playlistId,
      collection: { stream_conditions }
    } = this.props
    if (isContentUSDCPurchaseGated(stream_conditions)) {
      this.props.openConfirmationModal({
        trackId,
        playlistId,
        uid,
        timestamp
      })
    } else {
      this.props.removeTrackFromPlaylist(trackId, playlistId, uid, timestamp)
    }
  }

  onPlay = ({ isPreview = false }: { isPreview?: boolean } = {}) => {
    const {
      playing,
      play,
      pause,
      previewing,
      tracks: { entries },
      record,
      stop,
      collection,
      userId
    } = this.props
    const isQueued = this.isQueued()
    const playingId = this.getPlayingId()
    const isOwner = collection?.playlist_owner_id === userId

    const shouldPreview = isPreview && isOwner
    if (playing && isQueued && previewing === shouldPreview) {
      pause()
      record(
        make(Name.PLAYBACK_PAUSE, {
          id: `${playingId}`,
          source: PlaybackSource.PLAYLIST_PAGE
        })
      )
    } else if (!playing && previewing === shouldPreview && isQueued) {
      play()
      record(
        make(Name.PLAYBACK_PLAY, {
          id: `${playingId}`,
          isPreview: shouldPreview,
          source: PlaybackSource.PLAYLIST_PAGE
        })
      )
    } else if (entries.length > 0) {
      stop()
      play(entries[0].uid, { isPreview: shouldPreview && isOwner })
      record(
        make(Name.PLAYBACK_PLAY, {
          id: `${entries[0].track_id}`,
          isPreview: shouldPreview,
          source: PlaybackSource.PLAYLIST_PAGE
        })
      )
    }
  }

  onPreview = () => this.onPlay({ isPreview: true })

  onSortTracks = (sorters: any) => {
    const { column, order } = sorters
    const {
      tracks: { entries }
    } = this.props
    const dataSource = this.formatMetadata(entries)
    let updatedOrder
    if (!column) {
      updatedOrder = this.state.initialOrder
      this.setState({ allowReordering: true })
    } else {
      updatedOrder = dataSource
        .sort((a, b) =>
          order === 'ascend' ? column.sorter(a, b) : column.sorter(b, a)
        )
        .map((metadata) => metadata.uid)
      this.setState({ allowReordering: false })
    }
    if (updatedOrder) {
      this.props.updateLineupOrder(updatedOrder)
    }
  }

  onReorderTracks = (source: number, destination: number) => {
    const { tracks, order } = this.props

    const newOrder = Array.from(this.state.initialOrder!)
    newOrder.splice(source, 1)
    newOrder.splice(destination, 0, this.state.initialOrder![source])

    const trackIdAndTimes = newOrder.map((uid: any) => ({
      id: tracks.entries[order[uid]].track_id,
      time: tracks.entries[order[uid]].dateAdded.unix()
    }))

    this.props.updateLineupOrder(newOrder)
    this.setState({ initialOrder: newOrder })
    this.props.orderPlaylist(this.props.playlistId!, trackIdAndTimes, newOrder)
  }

  onPublish = () => {
    this.props.publishPlaylist(this.props.playlistId!)
  }

  onSavePlaylist = (isSaved: boolean, playlistId: number) => {
    if (isSaved) {
      this.props.unsaveCollection(playlistId)
    } else {
      this.props.saveCollection(playlistId)
    }
  }

  onRepostPlaylist = (isReposted: boolean, playlistId: number) => {
    if (isReposted) {
      this.props.undoRepostCollection(playlistId)
    } else {
      this.props.repostCollection(playlistId)
    }
  }

  onSharePlaylist = (playlistId: number) => {
    this.props.shareCollection(playlistId)
  }

  onHeroTrackShare = () => {
    const { playlistId } = this.props
    this.onSharePlaylist(playlistId!)
  }

  onHeroTrackSave = () => {
    const { playlistId, collection: metadata } = this.props
    const isSaved =
      metadata && playlistId ? metadata.has_current_user_saved : false
    this.onSavePlaylist(!!isSaved, playlistId!)
  }

  onHeroTrackRepost = () => {
    const { collection: metadata } = this.props
    const { playlistId } = this.props
    const isReposted = metadata ? metadata.has_current_user_reposted : false
    this.onRepostPlaylist(isReposted, playlistId!)
  }

  onClickReposts = () => {
    const {
      collection: metadata,
      setRepostPlaylistId,
      goToRoute,
      isMobile,
      setRepostUsers,
      setModalVisibility
    } = this.props
    if (!metadata) return
    if (isMobile) {
      setRepostPlaylistId(metadata.playlist_id)
      goToRoute(REPOSTING_USERS_ROUTE)
    } else {
      setRepostUsers(metadata.playlist_id)
      setModalVisibility()
    }
  }

  onClickFavorites = () => {
    const {
      collection: metadata,
      setFavoritePlaylistId,
      goToRoute,
      isMobile,
      setFavoriteUsers,
      setModalVisibility
    } = this.props
    if (!metadata) return
    if (isMobile) {
      setFavoritePlaylistId(metadata.playlist_id)
      goToRoute(FAVORITING_USERS_ROUTE)
    } else {
      setFavoriteUsers(metadata.playlist_id)
      setModalVisibility()
    }
  }

  onFollow = () => {
    const { onFollow, collection: metadata } = this.props
    if (metadata) onFollow(metadata.playlist_owner_id)
  }

  onUnfollow = () => {
    const { onUnfollow, collection: metadata } = this.props
    if (metadata) onUnfollow(metadata.playlist_owner_id)
  }

  render() {
    const {
      playing,
      previewing,
      type,
      status,
      collection: metadata,
      user,
      tracks,
      userId,
      trackCount
    } = this.props
    const { allowReordering } = this.state
    const { playlistId } = this.props

    const {
      title = '',
      description = '',
      canonicalUrl = '',
      structuredData
    } = getCollectionPageSEOFields({
      playlistName: metadata?.playlist_name,
      playlistId: metadata?.playlist_id,
      userName: user?.name,
      userHandle: user?.handle,
      isAlbum: metadata?.is_album,
      permalink: metadata?.permalink
    })

    const childProps = {
      title,
      description,
      canonicalUrl,
      structuredData,
      playlistId: playlistId!,
      allowReordering,
      playing,
      previewing,
      type,
      collection: { status, metadata, user },
      tracks,
      userId,
      getPlayingUid: this.getPlayingUid,
      getFilteredData: this.getFilteredData,
      isQueued: this.isQueued,
      onFilterChange: this.onFilterChange,
      onPlay: this.onPlay,
      onPreview: this.onPreview,
      onPublish: this.onPublish,
      onHeroTrackShare: this.onHeroTrackShare,
      onHeroTrackSave: this.onHeroTrackSave,
      onHeroTrackRepost: this.onHeroTrackRepost,
      onClickRow: this.onClickRow,
      onClickRepostTrack: this.onClickRepostTrack,
      onClickPurchaseTrack: this.onClickPurchaseTrack,
      onSortTracks: this.onSortTracks,
      onReorderTracks: this.onReorderTracks,
      onClickRemove: this.onClickRemove,
      onClickMobileOverflow: this.props.clickOverflow,
      onClickFavorites: this.onClickFavorites,
      onClickReposts: this.onClickReposts,
      onFollow: this.onFollow,
      onUnfollow: this.onUnfollow,
      refresh: this.refreshCollection,
      trackCount
    }

    if ((metadata?.is_delete || metadata?._marked_deleted) && user) {
      return (
        <DeletedPage
          title={title}
          description={description}
          canonicalUrl={canonicalUrl}
          structuredData={structuredData}
          playable={{
            metadata,
            type: metadata?.is_album
              ? PlayableType.ALBUM
              : PlayableType.PLAYLIST
          }}
          user={user}
        />
      )
    }

    // Note:
    // While some of our other page components key by playlist id, etc.
    // here to allow for multiple pages to be in view at the same time while
    // animating. Because we use temporary ids (which impact the URL) for
    // playlists during creation, we can't simply key here by path or playlistId
    // because we do not want a playlist transitioning from temp => not temp
    // to trigger a rerender of everything
    return <this.props.children {...childProps} />
  }
}

function makeMapStateToProps() {
  const getLineupOrder = makeGetLineupOrder(getCollectionTracksLineup)
  const getCurrentQueueItem = makeGetCurrent()

  const mapStateToProps = (state: AppState) => {
    return {
      collectionPermalink: getCollectionPermalink(state),
      userUid: getUserUid(state) || '',
      status: getCollectionTracksLineup(state)?.status || Status.LOADING,
      order: getLineupOrder(state),
      currentQueueItem: getCurrentQueueItem(state),
      playing: getPlaying(state),
      previewing: getPlayerBehavior(state) === PlayerBehavior.PREVIEW_OR_FULL,
      buffering: getBuffering(state),
      pathname: getLocationPathname(state),
      playlistUpdates: selectAllPlaylistUpdateIds(state)
    }
  }
  return mapStateToProps
}

function mapDispatchToProps(dispatch: Dispatch) {
  return {
    fetchCollection: ({
      id,
      permalink,
      fetchLineup,
      forceFetch
    }: {
      id: Nullable<number>
      permalink?: string
      fetchLineup?: boolean
      forceFetch?: boolean
    }) =>
      dispatch(
        collectionActions.fetchCollection(
          id,
          permalink,
          fetchLineup,
          forceFetch
        )
      ),
    fetchTracks: () =>
      dispatch(tracksActions.fetchLineupMetadatas(0, 200, false, undefined)),
    resetCollection: () => dispatch(collectionActions.resetCollection()),
    goToRoute: (route: string) => dispatch(push(route)),
    replaceRoute: (route: string) => dispatch(replace(route)),
    play: (uid?: string, options: { isPreview?: boolean } = {}) =>
      dispatch(tracksActions.play(uid, options)),
    pause: () => dispatch(tracksActions.pause()),
    stop: () => {
      dispatch(playerActions.stop({}))
    },
    updateLineupOrder: (updatedOrderIndices: any) =>
      dispatch(tracksActions.updateLineupOrder(updatedOrderIndices)),
    editPlaylist: (playlistId: number, formFields: any) =>
      dispatch(editPlaylist(playlistId, formFields)),
    removeTrackFromPlaylist: (
      trackId: number,
      playlistId: number,
      uid: string,
      timestamp: number
    ) => {
      dispatch(removeTrackFromPlaylist(trackId, playlistId, timestamp))
      dispatch(tracksActions.remove(Kind.TRACKS, uid))
    },
    orderPlaylist: (playlistId: number, trackIds: any, trackUids: string[]) =>
      dispatch(orderPlaylist(playlistId, trackIds, trackUids)),
    publishPlaylist: (playlistId: number) =>
      dispatch(publishPlaylist(playlistId)),

    saveCollection: (playlistId: number) =>
      dispatch(
        socialCollectionsActions.saveCollection(
          playlistId,
          FavoriteSource.COLLECTION_PAGE
        )
      ),

    unsaveCollection: (playlistId: number) =>
      dispatch(
        socialCollectionsActions.unsaveCollection(
          playlistId,
          FavoriteSource.COLLECTION_PAGE
        )
      ),

    repostCollection: (playlistId: number) =>
      dispatch(
        socialCollectionsActions.repostCollection(
          playlistId,
          RepostSource.COLLECTION_PAGE
        )
      ),
    undoRepostCollection: (playlistId: number) =>
      dispatch(
        socialCollectionsActions.undoRepostCollection(
          playlistId,
          RepostSource.COLLECTION_PAGE
        )
      ),
    shareCollection: (playlistId: number) =>
      dispatch(
        requestOpenShareModal({
          type: 'collection',
          collectionId: playlistId,
          source: ShareSource.TILE
        })
      ),
    repostTrack: (trackId: number) =>
      dispatch(
        socialTracksActions.repostTrack(trackId, RepostSource.COLLECTION_PAGE)
      ),
    undoRepostTrack: (trackId: number) =>
      dispatch(
        socialTracksActions.undoRepostTrack(
          trackId,
          RepostSource.COLLECTION_PAGE
        )
      ),
    saveTrack: (trackId: number) =>
      dispatch(
        socialTracksActions.saveTrack(trackId, FavoriteSource.COLLECTION_PAGE)
      ),
    unsaveTrack: (trackId: number) =>
      dispatch(
        socialTracksActions.unsaveTrack(trackId, FavoriteSource.COLLECTION_PAGE)
      ),
    fetchCollectionSucceeded: (
      collectionId: ID,
      collectionPermalink: string,
      userId: string
    ) =>
      dispatch(
        collectionActions.fetchCollectionSucceeded(
          collectionId,
          collectionPermalink,
          userId
        )
      ),
    onFollow: (userId: ID) =>
      dispatch(
        socialUsersActions.followUser(userId, FollowSource.COLLECTION_PAGE)
      ),
    onUnfollow: (userId: ID) =>
      dispatch(
        socialUsersActions.unfollowUser(userId, FollowSource.COLLECTION_PAGE)
      ),
    clickOverflow: (collectionId: ID, overflowActions: OverflowAction[]) =>
      dispatch(
        open({
          source: OverflowSource.COLLECTIONS,
          id: collectionId,
          overflowActions
        })
      ),
    setRepostPlaylistId: (collectionId: ID) =>
      dispatch(setRepost(collectionId, RepostType.COLLECTION)),
    setFavoritePlaylistId: (collectionId: ID) =>
      dispatch(setFavorite(collectionId, FavoriteType.PLAYLIST)),
    record: (event: TrackEvent) => dispatch(event),
    setRepostUsers: (trackID: ID) =>
      dispatch(
        setUsers({
          userListType: UserListType.REPOST,
          entityType: UserListEntityType.COLLECTION,
          id: trackID
        })
      ),
    setFavoriteUsers: (trackID: ID) =>
      dispatch(
        setUsers({
          userListType: UserListType.FAVORITE,
          entityType: UserListEntityType.COLLECTION,
          id: trackID
        })
      ),
    setModalVisibility: () => dispatch(setVisibility(true)),
    openConfirmationModal: (args: AlbumTrackRemoveConfirmationModalState) =>
      dispatch(albumTrackRemoveConfirmationModalActions.open(args)),
    updatePlaylistLastViewedAt: (playlistId: ID) =>
      dispatch(updatedPlaylistViewed({ playlistId })),
    openPremiumContentPurchaseModal: (
      args: PremiumContentPurchaseModalState & { source: ModalSource }
    ) => {
      // Since we cant use the premium modal hook we have to manually trigger the modal action & the analytics tracking call
      dispatch(usePremiumContentPurchaseModalActions.open(args))
      dispatch(
        trackModalOpened({
          name: 'PremiumContentPurchaseModal',
          trackingData: args,
          source: args.source
        })
      )
    }
  }
}

const ConnectedCollectionPage = connect(
  makeMapStateToProps,
  mapDispatchToProps
)(CollectionPage)

const CollectionPageProviderWrapper = (
  props: Omit<
    ComponentProps<typeof ConnectedCollectionPage>,
    'location' | 'history'
  >
) => {
  const location = useLocation()
  const { history } = useHistoryContext()

  return (
    <ConnectedCollectionPage {...props} location={location} history={history} />
  )
}

export default CollectionPageProviderWrapper
