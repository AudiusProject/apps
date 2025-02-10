import { ChangeEvent, Component, ComponentType } from 'react'

import { useCollectionByParams, useCurrentUser } from '@audius/common/api'
import {
  Name,
  ShareSource,
  RepostSource,
  FavoriteSource,
  PlaybackSource,
  FavoriteType,
  PlayableType,
  Kind,
  Collection,
  SmartCollection,
  ID,
  UID,
  isContentUSDCPurchaseGated,
  UserMetadata,
  UserCollectionMetadata,
  ModalSource,
  FollowSource
} from '@audius/common/models'
import {
  accountSelectors,
  cacheCollectionsActions,
  lineupSelectors,
  collectionPageLineupActions as tracksActions,
  collectionPageSelectors,
  collectionPageActions as collectionActions,
  queueSelectors,
  collectionsSocialActions as socialCollectionsActions,
  tracksSocialActions as socialTracksActions,
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
  playerActions
} from '@audius/common/store'
import { formatUrlName, route } from '@audius/common/utils'
import { UnregisterCallback } from 'history'
import { connect } from 'react-redux'
import { withRouter, RouteComponentProps } from 'react-router-dom'
import { Dispatch } from 'redux'

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
const {
  getCollection,
  getCollectionTracksLineup,
  getCollectionUid,
  getUserUid,
  getCollectionPermalink
} = collectionPageSelectors
const { updatedPlaylistViewed } = playlistUpdatesActions
const { makeGetTableMetadatas, makeGetLineupOrder } = lineupSelectors
const {
  removeTrackFromPlaylist,
  orderPlaylist,
  publishPlaylist,
  deletePlaylist
} = cacheCollectionsActions

const { getAccountCollections } = accountSelectors

type OwnProps = {
  type: CollectionsPageType
  isMobile: boolean
  children:
    | ComponentType<MobileCollectionPageProps>
    | ComponentType<DesktopCollectionPageProps>

  // Smart collection props
  smartCollection?: SmartCollection
}

type CollectionPageProviderProps = OwnProps &
  ReturnType<ReturnType<typeof makeMapStateToProps>> &
  ReturnType<typeof mapDispatchToProps> &
  RouteComponentProps & {
    onFollow: ({
      followeeUserId,
      source
    }: {
      followeeUserId: ID
      source: FollowSource
    }) => void
    onUnfollow: ({
      followeeUserId,
      source
    }: {
      followeeUserId: ID
      source: FollowSource
    }) => void
  }

type CollectionPageState = {
  filterText: string
  initialOrder: string[] | null
  playlistId: number | null
  reordering: string[] | null
  allowReordering: boolean
}

type PlaylistTrack = { time: number; track: ID; uid?: UID }

const CollectionPageProvider = (props: CollectionPageProviderProps) => {
  const params = parseCollectionRoute(getPathname(props.location))
  const { data: collection, status } = useCollectionByParams(params!)
  const { data: user } = useCurrentUser()
  if (!collection) return <div>Loading...</div>
  return (
    <CollectionPage
      {...props}
      collection={collection}
      collectionId={collection.playlist_id}
      status={status}
      user={user}
    />
  )
}

type CollectionPageProps = CollectionPageProviderProps & {
  collectionId: number | undefined
  collection: UserCollectionMetadata | null | undefined
  status: 'pending' | 'success' | 'error'
  user: UserMetadata | null | undefined
}

class CollectionPage extends Component<
  CollectionPageProps,
  CollectionPageState
> {
  state: CollectionPageState = {
    filterText: '',
    initialOrder: null,
    playlistId: null,
    // For drag + drop reordering
    reordering: null,
    allowReordering: true
  }

  unlisten!: UnregisterCallback

  componentDidMount() {
    this.unlisten = this.props.history.listen((location, action) => {
      if (
        action !== 'REPLACE' &&
        getPathname(this.props.location) !== getPathname(location)
      ) {
        // If the action is not replace (e.g. we are not trying to update
        // the URL for the same playlist. Reset it.)
        this.resetCollection()
      }
      this.setState({
        initialOrder: null,
        reordering: null
      })
    })
  }

  componentDidUpdate(prevProps: CollectionPageProps) {
    const {
      collection,
      status,
      user,
      tracks,
      pathname,
      type,
      playlistUpdates,
      updatePlaylistLastViewedAt
    } = this.props
    const { playlist_id, playlist_name, is_album, playlist_owner_id } =
      collection ?? {}
    const { user_id: userId } = user ?? {}

    if (
      type === 'playlist' &&
      playlist_id &&
      playlistUpdates.includes(playlist_id)
    ) {
      updatePlaylistLastViewedAt(playlist_id)
    }

    const { initialOrder } = this.state

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
    if (status === 'error') {
      if (
        params &&
        params.collectionId === playlist_id &&
        playlist_owner_id !== userId
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

    const { collection: prevMetadata } = prevProps
    if (this.props.collection) {
      const params = parseCollectionRoute(pathname)
      if (params) {
        const { collectionId, title, collectionType, handle, permalink } =
          params
        const newCollectionName = formatUrlName(playlist_name)

        const routeLacksCollectionInfo =
          (title === null || handle === null || collectionType === null) &&
          permalink == null &&
          user
        if (routeLacksCollectionInfo) {
          // Check if we are coming from a non-canonical route and replace route if necessary.
          const newPath = collectionPage(
            user!.handle,
            playlist_name,
            playlist_id,
            permalink,
            is_album
          )
          this.props.replaceRoute(newPath)
        } else {
          // Id matches or temp id matches
          const idMatches = collectionId === playlist_id

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
      collection &&
      prevMetadata &&
      !this.playListContentsEqual(
        collection.playlist_contents.track_ids,
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

  resetCollection = () => {
    const { collectionUid, userUid } = this.props
    this.props.resetCollection(collectionUid, userUid)
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
    const { currentQueueItem } = this.props
    return currentQueueItem.track ? currentQueueItem.track.track_id : null
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
        metadata.is_unlisted && this.props.user?.user_id !== metadata.owner_id
          ? -1
          : metadata.play_count
    }))
  }

  getFilteredData = (trackMetadatas: CollectionTrack[]) => {
    const filterText = this.state.filterText
    const { tracks } = this.props
    const playingUid = this.getPlayingUid()
    const playingIndex = tracks.entries.findIndex(
      ({ uid }) => uid === playingUid
    )
    const filteredMetadata = this.formatMetadata(trackMetadatas).filter(
      (item) =>
        item.title.toLowerCase().indexOf(filterText.toLowerCase()) > -1 ||
        item.user.name.toLowerCase().indexOf(filterText.toLowerCase()) > -1
    )
    const filteredIndex =
      playingIndex > -1
        ? filteredMetadata.findIndex((metadata) => metadata.uid === playingUid)
        : playingIndex
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

  onClickSave = (record: CollectionPageTrackRecord) => {
    if (!record.has_current_user_saved) {
      this.props.saveTrack(record.track_id)
    } else {
      this.props.unsaveTrack(record.track_id)
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
    const { collectionId, collection } = this.props
    if (isContentUSDCPurchaseGated(collection?.stream_conditions)) {
      this.props.openConfirmationModal({
        trackId,
        playlistId: collectionId,
        uid,
        timestamp
      })
    } else {
      if (!trackId || !collection?.playlist_id) return
      this.props.removeTrackFromPlaylist(
        trackId,
        collection.playlist_id,
        uid,
        timestamp
      )
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
      user
    } = this.props
    const isQueued = this.isQueued()
    const playingId = this.getPlayingId()
    const isOwner = collection?.playlist_owner_id === user?.user_id
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
    const { tracks, order, collectionId } = this.props

    const newOrder = Array.from(this.state.initialOrder!)
    newOrder.splice(source, 1)
    newOrder.splice(destination, 0, this.state.initialOrder![source])

    const trackIdAndTimes = newOrder.map((uid: any) => ({
      id: tracks.entries[order[uid]].track_id,
      time: tracks.entries[order[uid]].dateAdded.unix()
    }))

    this.props.updateLineupOrder(newOrder)
    this.setState({ initialOrder: newOrder })
    this.props.orderPlaylist(collectionId!, trackIdAndTimes, newOrder)
  }

  onPublish = () => {
    this.props.publishPlaylist(this.props.collectionId!)
  }

  onSavePlaylist = (isSaved: boolean, playlistId: number) => {
    if (isSaved) {
      this.props.unsaveCollection(playlistId)
    } else {
      this.props.saveCollection(playlistId)
    }
  }

  onSaveSmartCollection = (isSaved: boolean, smartCollectionName: string) => {
    if (isSaved) {
      this.props.unsaveSmartCollection(smartCollectionName)
    } else {
      this.props.saveSmartCollection(smartCollectionName)
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
    const { collectionId } = this.props
    this.onSharePlaylist(collectionId!)
  }

  onHeroTrackSave = () => {
    const { userPlaylists, collection: metadata, smartCollection } = this.props
    const { collectionId } = this.props
    const isSaved =
      (metadata && collectionId
        ? metadata.has_current_user_saved || collectionId in userPlaylists
        : false) ||
      (smartCollection && smartCollection.has_current_user_saved)

    if (smartCollection && metadata) {
      this.onSaveSmartCollection(!!isSaved, metadata.playlist_name)
    } else {
      this.onSavePlaylist(!!isSaved, collectionId!)
    }
  }

  onHeroTrackRepost = () => {
    const { collection: metadata } = this.props
    const { collectionId } = this.props
    const isReposted = metadata ? metadata.has_current_user_reposted : false
    this.onRepostPlaylist(isReposted, collectionId!)
  }

  onClickReposts = () => {
    const {
      collection,
      collectionId,
      setRepostPlaylistId,
      goToRoute,
      isMobile,
      setRepostUsers,
      setModalVisibility
    } = this.props
    if (!collection) return
    if (isMobile) {
      setRepostPlaylistId(collectionId!)
      goToRoute(REPOSTING_USERS_ROUTE)
    } else {
      setRepostUsers(collectionId!)
      setModalVisibility()
    }
  }

  onClickFavorites = () => {
    const {
      collection,
      collectionId,
      setFavoritePlaylistId,
      goToRoute,
      isMobile,
      setFavoriteUsers,
      setModalVisibility
    } = this.props
    if (!collection) return
    if (isMobile) {
      setFavoritePlaylistId(collectionId!)
      goToRoute(FAVORITING_USERS_ROUTE)
    } else {
      setFavoriteUsers(collectionId!)
      setModalVisibility()
    }
  }

  render() {
    const {
      playing,
      previewing,
      type,
      status,
      collection,
      collectionId,
      user,
      tracks,
      userPlaylists,
      smartCollection,
      trackCount,
      onFollow,
      onUnfollow
    } = this.props
    const { allowReordering } = this.state

    const {
      title = '',
      description = '',
      canonicalUrl = '',
      structuredData
    } = getCollectionPageSEOFields({
      playlistName: collection?.playlist_name,
      playlistId: collectionId,
      userName: user?.name,
      userHandle: user?.handle,
      isAlbum: collection?.is_album,
      permalink: collection?.permalink
    })

    const childProps = {
      title,
      description,
      canonicalUrl,
      structuredData,
      // TODO: we should either not render the children or expect empty collectionId
      collectionId: collectionId!,
      allowReordering,
      playing,
      previewing,
      type,
      collection: smartCollection
        ? { status: 'success' as const, metadata: smartCollection, user: null }
        : { status, metadata: collection ?? null, user },
      tracks,
      userId: user?.user_id,
      userPlaylists,
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
      onClickSave: this.onClickSave,
      onClickRepostTrack: this.onClickRepostTrack,
      onClickPurchaseTrack: this.onClickPurchaseTrack,
      onSortTracks: this.onSortTracks,
      onReorderTracks: this.onReorderTracks,
      onClickRemove: this.onClickRemove,
      onClickMobileOverflow: this.props.clickOverflow,
      onClickFavorites: this.onClickFavorites,
      onClickReposts: this.onClickReposts,
      onFollow,
      onUnfollow,
      trackCount
    }

    if (collection?.is_delete && user) {
      return (
        <DeletedPage
          title={title}
          description={description}
          canonicalUrl={canonicalUrl}
          structuredData={structuredData}
          playable={{
            metadata: collection,
            type: collection?.is_album
              ? PlayableType.ALBUM
              : PlayableType.PLAYLIST
          }}
          user={user}
        />
      )
    }

    return <this.props.children {...childProps} />
  }
}

function makeMapStateToProps() {
  const getTracksLineup = makeGetTableMetadatas(getCollectionTracksLineup)
  const getLineupOrder = makeGetLineupOrder(getCollectionTracksLineup)
  const getCurrentQueueItem = makeGetCurrent()

  const mapStateToProps = (state: AppState) => {
    return {
      tracks: getTracksLineup(state),
      trackCount: (getCollection(state) as Collection)?.playlist_contents
        .track_ids.length,
      collectionUid: getCollectionUid(state) || '',
      collectionPermalink: getCollectionPermalink(state),
      order: getLineupOrder(state),
      userUid: getUserUid(state) || '',
      userPlaylists: getAccountCollections(state),
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
    fetchTracks: () =>
      dispatch(tracksActions.fetchLineupMetadatas(0, 200, false, undefined)),
    resetCollection: (collectionUid: string, userUid: string) =>
      dispatch(collectionActions.resetCollection(collectionUid, userUid)),
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
    deletePlaylist: (playlistId: number) =>
      dispatch(deletePlaylist(playlistId)),

    saveCollection: (playlistId: number) =>
      dispatch(
        socialCollectionsActions.saveCollection(
          playlistId,
          FavoriteSource.COLLECTION_PAGE
        )
      ),
    saveSmartCollection: (smartCollectionName: string) =>
      dispatch(
        socialCollectionsActions.saveSmartCollection(
          smartCollectionName,
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
    unsaveSmartCollection: (smartCollectionName: string) =>
      dispatch(
        socialCollectionsActions.unsaveSmartCollection(
          smartCollectionName,
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

export default withRouter(
  connect(makeMapStateToProps, mapDispatchToProps)(CollectionPageProvider)
)
