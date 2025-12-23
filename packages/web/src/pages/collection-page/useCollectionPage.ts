import { ChangeEvent, useEffect, useState, useRef, useCallback } from 'react'

import {
  useCollectionByParams,
  useUser,
  useCurrentUserId
} from '@audius/common/api'
import { useCurrentTrack } from '@audius/common/hooks'
import {
  Status,
  ID,
  isContentUSDCPurchaseGated,
  ModalSource,
  Name,
  ShareSource,
  RepostSource,
  FavoriteSource,
  FavoriteType,
  FollowSource,
  PlaybackSource,
  Kind
} from '@audius/common/models'
import {
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
  albumTrackRemoveConfirmationModalActions,
  PlayerBehavior,
  playerActions,
  useLineupTable,
  lineupSelectors,
  cacheCollectionsActions
} from '@audius/common/store'
import { formatUrlName, Uid, route, makeUid } from '@audius/common/utils'
import { useDispatch, useSelector } from 'react-redux'
import { useLocation, useNavigate } from 'react-router-dom'

import { useHistoryContext } from 'app/HistoryProvider'
import { make } from 'common/store/analytics/actions'
import {
  setUsers,
  setVisibility
} from 'store/application/ui/userListModal/slice'
import {
  UserListType,
  UserListEntityType
} from 'store/application/ui/userListModal/types'
import { replace } from 'utils/navigation'
import { getPathname, collectionPage, profilePage } from 'utils/route'
import { parseCollectionRoute } from 'utils/route/collectionRouteParser'
import { getCollectionPageSEOFields } from 'utils/seo'

const { NOT_FOUND_PAGE, REPOSTING_USERS_ROUTE, FAVORITING_USERS_ROUTE } = route
const { trackModalOpened } = modalsActions
const { selectAllPlaylistUpdateIds } = playlistUpdatesSelectors
const { makeGetCurrent, getPlayerBehavior } = queueSelectors
const { getPlaying } = playerSelectors
const { setFavorite } = favoritesUserListActions
const { setRepost } = repostsUserListActions
const { requestOpen: requestOpenShareModal } = shareModalUIActions
const { open } = mobileOverflowMenuUIActions
const { getCollectionTracksLineup } = collectionPageSelectors
const { updatedPlaylistViewed } = playlistUpdatesActions
const { makeGetLineupOrder } = lineupSelectors
const { removeTrackFromPlaylist, orderPlaylist, publishPlaylist } =
  cacheCollectionsActions

export const useCollectionPage = (
  type: CollectionsPageType,
  isMobile: boolean
) => {
  const location = useLocation()
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const { history } = useHistoryContext()
  const pathname = getPathname(location)

  const params = parseCollectionRoute(pathname)
  const { data: collection } = useCollectionByParams(params)
  const { data: user } = useUser(collection?.playlist_owner_id)
  const { data: accountUserId } = useCurrentUserId()
  const currentTrack = useCurrentTrack()

  const tracks = useLineupTable(getCollectionTracksLineup)
  const playing = useSelector(getPlaying)
  const playerBehavior = useSelector(getPlayerBehavior)
  const previewing = playerBehavior === PlayerBehavior.PREVIEW_OR_FULL
  const status = useSelector(
    (state: any) => getCollectionTracksLineup(state)?.status ?? Status.LOADING
  )
  const currentQueueItem = useSelector(makeGetCurrent())
  const order = useSelector(makeGetLineupOrder(getCollectionTracksLineup))
  const playlistUpdates = useSelector(selectAllPlaylistUpdateIds)
  // Note: These selectors are available but not currently used in the hook
  // const reduxCollectionId = useSelector((state: any) => getCollectionId(state))
  // const reduxCollectionPermalink = useSelector((state: any) => getCollectionPermalink(state))
  // const pathnameFromState = useSelector(getLocationPathname)

  const trackCount = collection?.playlist_contents.track_ids.length ?? 0
  const playlistId = collection?.playlist_id

  // State
  const [filterText, setFilterText] = useState('')
  const [initialOrder, setInitialOrder] = useState<string[] | null>(null)
  const [allowReordering, setAllowReordering] = useState(true)
  const [updatingRoute, setUpdatingRoute] = useState(false)
  const [localPlaylistId, setLocalPlaylistId] = useState<number | null>(null)
  const prevPathnameRef = useRef(pathname)
  const historyUnlistenRef = useRef<(() => void) | null>(null)

  // Fetch collection function
  const fetchCollection = useCallback(
    (pathnameToFetch: string, fetchLineup = false) => {
      const paramsToFetch = parseCollectionRoute(pathnameToFetch)
      if (!paramsToFetch) return

      const { permalink, collectionId } = paramsToFetch

      const locationState = location.state as
        | { forceFetch?: boolean }
        | undefined
      const forceFetch = locationState?.forceFetch

      if (forceFetch || permalink || collectionId !== localPlaylistId) {
        setLocalPlaylistId(collectionId as number)
        dispatch(
          collectionActions.fetchCollection(
            collectionId,
            permalink,
            fetchLineup,
            forceFetch
          )
        )
      }
    },
    [dispatch, location.state, localPlaylistId]
  )

  // Reset collection function
  const resetCollection = useCallback(() => {
    dispatch(collectionActions.resetCollection())
  }, [dispatch])

  // Fetch collection on mount and route changes
  useEffect(() => {
    fetchCollection(pathname, true)
  }, [pathname, fetchCollection])

  // Set up history listener
  useEffect(() => {
    if (!history?.listen) return

    const unlisten = history.listen((location, action) => {
      const newPathname = getPathname(location)
      if (action !== 'REPLACE' && prevPathnameRef.current !== newPathname) {
        resetCollection()
      }
      prevPathnameRef.current = newPathname
      fetchCollection(newPathname, true)
      setInitialOrder(null)
    })

    historyUnlistenRef.current = unlisten

    return () => {
      if (historyUnlistenRef.current) {
        historyUnlistenRef.current()
        historyUnlistenRef.current = null
      }
    }
  }, [history, fetchCollection, resetCollection])

  // Reset collection on unmount (desktop only)
  useEffect(() => {
    return () => {
      if (!isMobile) {
        resetCollection()
      }
    }
  }, [isMobile, resetCollection])

  // Update playlist viewed
  useEffect(() => {
    if (!collection) return
    if (
      type === 'playlist' &&
      playlistId &&
      playlistUpdates.includes(playlistId)
    ) {
      dispatch(updatedPlaylistViewed({ playlistId }))
    }
  }, [collection, playlistId, type, playlistUpdates, dispatch])

  // Initialize order from tracks
  useEffect(() => {
    const newInitialOrder = tracks.entries.map((track) => track.uid)
    const noInitialOrder = !initialOrder && tracks.entries.length > 0
    const prevEntryIds = new Set(initialOrder)
    const newUids =
      Array.isArray(initialOrder) &&
      initialOrder.length > 0 &&
      newInitialOrder.length > 0 &&
      !newInitialOrder.every((id) => prevEntryIds.has(id))

    if (noInitialOrder || newUids) {
      setInitialOrder(newInitialOrder)
    }
  }, [tracks.entries, initialOrder])

  // Error handling
  useEffect(() => {
    if (!params || !collection) return
    if (status === Status.ERROR) {
      if (
        params.collectionId === playlistId &&
        collection?.playlist_owner_id !== accountUserId
      ) {
        navigate(NOT_FOUND_PAGE)
      }
    }
  }, [status, params, playlistId, collection, accountUserId, navigate])

  // Redirect if user deactivated
  useEffect(() => {
    if (user?.is_deactivated) {
      navigate(profilePage(user.handle))
    }
  }, [user, navigate])

  // Handle collection moved
  useEffect(() => {
    if (!collection || updatingRoute || !collection._moved) return
    const collectionId = Uid.fromString(collection._moved).id as number
    const userUid = makeUid(Kind.USERS, collection.playlist_owner_id)
    dispatch(
      collectionActions.fetchCollectionSucceeded(
        collectionId,
        collection.permalink ?? '',
        userUid
      )
    )
    const newPath = pathname.replace(
      `${collection.playlist_id}`,
      collectionId.toString()
    )
    setLocalPlaylistId(collectionId)
    setInitialOrder(null)
    setUpdatingRoute(true)
    dispatch(replace(newPath))
  }, [collection, updatingRoute, pathname, dispatch])

  // Reset updatingRoute when collection is no longer moved
  useEffect(() => {
    if (collection && !collection._moved && updatingRoute) {
      setUpdatingRoute(false)
    }
  }, [collection, updatingRoute])

  // URL normalization
  useEffect(() => {
    if (!collection || !params || !user || updatingRoute) return

    const { collectionId, title, collectionType, handle, permalink } = params
    const newCollectionName = formatUrlName(collection.playlist_name)

    const routeLacksCollectionInfo =
      (title === null || handle === null || collectionType === null) &&
      permalink == null &&
      user
    if (routeLacksCollectionInfo) {
      const newPath = collectionPage(
        user.handle,
        collection.playlist_name,
        collectionId,
        collection.permalink,
        collection.is_album
      )
      const normalizePathname = (p: string) => {
        try {
          return decodeURIComponent(p)
        } catch {
          return p
        }
      }
      const normalizedPathname = normalizePathname(pathname)
      const normalizedNewPath = normalizePathname(newPath)

      if (normalizedNewPath !== normalizedPathname) {
        dispatch(replace(newPath))
      }
    } else if (title) {
      const idMatches =
        collectionId === collection.playlist_id ||
        (collection._temp && `${collectionId}` === `${collection.playlist_id}`)
      if (idMatches) {
        const normalizePathname = (p: string) => {
          try {
            return decodeURIComponent(p)
          } catch {
            return p
          }
        }
        const normalizedPathname = normalizePathname(pathname)
        const normalizedTitle = normalizePathname(title)
        const normalizedNewCollectionName = normalizePathname(newCollectionName)

        if (normalizedTitle !== normalizedNewCollectionName) {
          const newPath = normalizedPathname.replace(
            normalizedTitle,
            normalizedNewCollectionName
          )
          dispatch(replace(newPath))
        }
      }
    }
  }, [collection, params, user, pathname, dispatch, updatingRoute])

  // Refetch tracks if track count increased
  const prevTrackCountRef = useRef(trackCount)
  useEffect(() => {
    if (trackCount > prevTrackCountRef.current) {
      dispatch(tracksActions.fetchLineupMetadatas(0, 200, false, undefined))
    }
    prevTrackCountRef.current = trackCount
  }, [trackCount, dispatch])

  // Check if collection content changed and refetch tracks
  const prevCollectionRef = useRef(collection)
  useEffect(() => {
    if (
      collection &&
      prevCollectionRef.current &&
      collection.playlist_contents.track_ids.length ===
        prevCollectionRef.current.playlist_contents.track_ids.length
    ) {
      const prevIds = prevCollectionRef.current.playlist_contents.track_ids.map(
        (t) => t.track
      )
      const currIds = collection.playlist_contents.track_ids.map((t) => t.track)
      const contentsEqual =
        prevIds.length === currIds.length &&
        prevIds.every((id, idx) => id === currIds[idx])
      if (!contentsEqual) {
        dispatch(tracksActions.fetchLineupMetadatas(0, 200, false, undefined))
      }
    }
    prevCollectionRef.current = collection
  }, [collection, dispatch])

  // Helper functions
  const isQueued = useCallback(() => {
    return tracks.entries.some((entry) => currentQueueItem.uid === entry.uid)
  }, [tracks.entries, currentQueueItem.uid])

  const getPlayingUid = useCallback(() => {
    return currentQueueItem.uid
  }, [currentQueueItem.uid])

  const getPlayingId = useCallback(() => {
    return currentTrack?.track_id ?? null
  }, [currentTrack])

  const formatMetadata = useCallback(
    (trackMetadatas: CollectionTrack[]): CollectionPageTrackRecord[] => {
      return trackMetadatas.map((metadata, i) => ({
        ...metadata,
        key: `${metadata.title}_${metadata.uid}_${i}`,
        name: metadata.title,
        artist: metadata.user.name,
        handle: metadata.user.handle,
        date: metadata.dateAdded || metadata.created_at,
        time: metadata.duration,
        plays:
          metadata.is_unlisted && accountUserId !== metadata.owner_id
            ? -1
            : metadata.play_count
      }))
    },
    [accountUserId]
  )

  const getFilteredData = useCallback(
    (
      trackMetadatas: CollectionTrack[]
    ): [CollectionPageTrackRecord[], number] => {
      const playingUid = getPlayingUid()
      const activeIndex = tracks.entries.findIndex(
        ({ uid }) => uid === playingUid
      )
      const filteredMetadata = formatMetadata(trackMetadatas).filter(
        (item) =>
          item.title.toLowerCase().indexOf(filterText.toLowerCase()) > -1 ||
          item.user.name.toLowerCase().indexOf(filterText.toLowerCase()) > -1
      )
      const filteredIndex =
        activeIndex > -1
          ? filteredMetadata.findIndex(
              (metadata) => metadata.uid === playingUid
            )
          : activeIndex
      return [filteredMetadata, filteredIndex]
    },
    [filterText, tracks.entries, getPlayingUid, formatMetadata]
  )

  // Event handlers
  const onFilterChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setFilterText(e.target.value)
  }, [])

  const onClickRow = useCallback(
    (trackRecord: CollectionPageTrackRecord) => {
      const playingUid = getPlayingUid()
      if (playing && playingUid === trackRecord.uid) {
        dispatch(tracksActions.pause())
        dispatch(
          make(Name.PLAYBACK_PAUSE, {
            id: `${trackRecord.track_id}`,
            source: PlaybackSource.PLAYLIST_TRACK
          })
        )
      } else if (playingUid !== trackRecord.uid) {
        dispatch(tracksActions.play(trackRecord.uid))
        dispatch(
          make(Name.PLAYBACK_PLAY, {
            id: `${trackRecord.track_id}`,
            source: PlaybackSource.PLAYLIST_TRACK
          })
        )
      } else {
        dispatch(tracksActions.play())
        dispatch(
          make(Name.PLAYBACK_PLAY, {
            id: `${trackRecord.track_id}`,
            source: PlaybackSource.PLAYLIST_TRACK
          })
        )
      }
    },
    [playing, getPlayingUid, dispatch]
  )

  const onClickRepostTrack = useCallback(
    (record: CollectionPageTrackRecord) => {
      if (!record.has_current_user_reposted) {
        dispatch(
          socialTracksActions.repostTrack(
            record.track_id,
            RepostSource.COLLECTION_PAGE
          )
        )
      } else {
        dispatch(
          socialTracksActions.undoRepostTrack(
            record.track_id,
            RepostSource.COLLECTION_PAGE
          )
        )
      }
    },
    [dispatch]
  )

  const onClickPurchaseTrack = useCallback(
    (record: CollectionPageTrackRecord) => {
      dispatch(
        usePremiumContentPurchaseModalActions.open({
          contentId: record.track_id,
          contentType: PurchaseableContentType.TRACK
        })
      )
      dispatch(
        trackModalOpened({
          name: 'PremiumContentPurchaseModal',
          trackingData: {
            contentId: record.track_id,
            contentType: PurchaseableContentType.TRACK,
            source: ModalSource.TrackListItem
          },
          source: ModalSource.TrackListItem
        })
      )
    },
    [dispatch]
  )

  const onClickRemove = useCallback(
    (trackId: number, _index: number, uid: string, timestamp: number) => {
      if (!collection || !playlistId) return
      if (isContentUSDCPurchaseGated(collection.stream_conditions)) {
        dispatch(
          albumTrackRemoveConfirmationModalActions.open({
            trackId,
            playlistId,
            uid,
            timestamp
          })
        )
      } else {
        dispatch(removeTrackFromPlaylist(trackId, playlistId, timestamp))
        dispatch(tracksActions.remove(Kind.TRACKS, uid))
      }
    },
    [collection, playlistId, dispatch]
  )

  const onPlay = useCallback(
    ({ isPreview = false }: { isPreview?: boolean } = {}) => {
      const isQueuedValue = isQueued()
      const playingId = getPlayingId()
      const isOwner = collection?.playlist_owner_id === accountUserId

      const shouldPreview = isPreview && isOwner
      if (playing && isQueuedValue && previewing === shouldPreview) {
        dispatch(tracksActions.pause())
        dispatch(
          make(Name.PLAYBACK_PAUSE, {
            id: `${playingId}`,
            source: PlaybackSource.PLAYLIST_PAGE
          })
        )
      } else if (!playing && previewing === shouldPreview && isQueuedValue) {
        dispatch(tracksActions.play())
        dispatch(
          make(Name.PLAYBACK_PLAY, {
            id: `${playingId}`,
            isPreview: shouldPreview,
            source: PlaybackSource.PLAYLIST_PAGE
          })
        )
      } else if (tracks.entries.length > 0) {
        dispatch(playerActions.stop({}))
        dispatch(
          tracksActions.play(tracks.entries[0].uid, {
            isPreview: shouldPreview && isOwner
          })
        )
        dispatch(
          make(Name.PLAYBACK_PLAY, {
            id: `${tracks.entries[0].track_id}`,
            isPreview: shouldPreview,
            source: PlaybackSource.PLAYLIST_PAGE
          })
        )
      }
    },
    [
      playing,
      isQueued,
      previewing,
      collection,
      accountUserId,
      tracks.entries,
      getPlayingId,
      dispatch
    ]
  )

  const onPreview = useCallback(() => {
    onPlay({ isPreview: true })
  }, [onPlay])

  const onSortTracks = useCallback(
    (sorters: any) => {
      const { column, order } = sorters
      const dataSource = formatMetadata(tracks.entries)
      let updatedOrder
      if (!column) {
        updatedOrder = initialOrder
        setAllowReordering(true)
      } else {
        updatedOrder = dataSource
          .sort((a, b) =>
            order === 'ascend' ? column.sorter(a, b) : column.sorter(b, a)
          )
          .map((metadata) => metadata.uid)
        setAllowReordering(false)
      }
      if (updatedOrder) {
        dispatch(tracksActions.updateLineupOrder(updatedOrder))
      }
    },
    [tracks.entries, initialOrder, formatMetadata, dispatch]
  )

  const onReorderTracks = useCallback(
    (source: number, destination: number) => {
      if (!initialOrder || !playlistId) return

      const newOrder = Array.from(initialOrder)
      newOrder.splice(source, 1)
      newOrder.splice(destination, 0, initialOrder[source])

      const trackIdAndTimes = newOrder.map((uid: any) => ({
        id: tracks.entries[order[uid]].track_id,
        time: tracks.entries[order[uid]].dateAdded.unix()
      }))

      dispatch(tracksActions.updateLineupOrder(newOrder))
      setInitialOrder(newOrder)
      dispatch(orderPlaylist(playlistId, trackIdAndTimes, newOrder))
    },
    [initialOrder, playlistId, tracks.entries, order, dispatch]
  )

  const onPublish = useCallback(() => {
    if (!playlistId) return
    dispatch(publishPlaylist(playlistId))
  }, [playlistId, dispatch])

  const onSavePlaylist = useCallback(
    (isSaved: boolean, playlistIdToSave: number) => {
      if (isSaved) {
        dispatch(
          socialCollectionsActions.unsaveCollection(
            playlistIdToSave,
            FavoriteSource.COLLECTION_PAGE
          )
        )
      } else {
        dispatch(
          socialCollectionsActions.saveCollection(
            playlistIdToSave,
            FavoriteSource.COLLECTION_PAGE
          )
        )
      }
    },
    [dispatch]
  )

  const onRepostPlaylist = useCallback(
    (isReposted: boolean, playlistIdToRepost: number) => {
      if (isReposted) {
        dispatch(
          socialCollectionsActions.undoRepostCollection(
            playlistIdToRepost,
            RepostSource.COLLECTION_PAGE
          )
        )
      } else {
        dispatch(
          socialCollectionsActions.repostCollection(
            playlistIdToRepost,
            RepostSource.COLLECTION_PAGE
          )
        )
      }
    },
    [dispatch]
  )

  const onSharePlaylist = useCallback(
    (playlistIdToShare: number) => {
      dispatch(
        requestOpenShareModal({
          type: 'collection',
          collectionId: playlistIdToShare,
          source: ShareSource.TILE
        })
      )
    },
    [dispatch]
  )

  const onHeroTrackShare = useCallback(() => {
    if (playlistId) onSharePlaylist(playlistId)
  }, [playlistId, onSharePlaylist])

  const onHeroTrackSave = useCallback(() => {
    if (playlistId && collection) {
      const isSaved = collection.has_current_user_saved
      onSavePlaylist(!!isSaved, playlistId)
    }
  }, [playlistId, collection, onSavePlaylist])

  const onHeroTrackRepost = useCallback(() => {
    if (playlistId && collection) {
      const isReposted = collection.has_current_user_reposted
      onRepostPlaylist(isReposted, playlistId)
    }
  }, [playlistId, collection, onRepostPlaylist])

  const onClickReposts = useCallback(() => {
    if (!collection) return
    if (isMobile) {
      dispatch(setRepost(collection.playlist_id, RepostType.COLLECTION))
      navigate(REPOSTING_USERS_ROUTE)
    } else {
      dispatch(
        setUsers({
          userListType: UserListType.REPOST,
          entityType: UserListEntityType.COLLECTION,
          id: collection.playlist_id
        })
      )
      dispatch(setVisibility(true))
    }
  }, [collection, isMobile, dispatch, navigate])

  const onClickFavorites = useCallback(() => {
    if (!collection) return
    if (isMobile) {
      dispatch(setFavorite(collection.playlist_id, FavoriteType.PLAYLIST))
      navigate(FAVORITING_USERS_ROUTE)
    } else {
      dispatch(
        setUsers({
          userListType: UserListType.FAVORITE,
          entityType: UserListEntityType.COLLECTION,
          id: collection.playlist_id
        })
      )
      dispatch(setVisibility(true))
    }
  }, [collection, isMobile, dispatch, navigate])

  const onFollow = useCallback(() => {
    if (collection) {
      dispatch(
        socialUsersActions.followUser(
          collection.playlist_owner_id,
          FollowSource.COLLECTION_PAGE
        )
      )
    }
  }, [collection, dispatch])

  const onUnfollow = useCallback(() => {
    if (collection) {
      dispatch(
        socialUsersActions.unfollowUser(
          collection.playlist_owner_id,
          FollowSource.COLLECTION_PAGE
        )
      )
    }
  }, [collection, dispatch])

  const onClickMobileOverflow = useCallback(
    (collectionId: ID, overflowActions: OverflowAction[]) => {
      dispatch(
        open({
          source: OverflowSource.COLLECTIONS,
          id: collectionId,
          overflowActions
        })
      )
    },
    [dispatch]
  )

  const refreshCollection = useCallback(() => {
    fetchCollection(pathname, true)
  }, [fetchCollection, pathname])

  // SEO fields
  const seoFields = getCollectionPageSEOFields({
    playlistName: collection?.playlist_name,
    playlistId: collection?.playlist_id,
    userName: user?.name,
    userHandle: user?.handle,
    isAlbum: collection?.is_album,
    permalink: collection?.permalink
    // hashId is optional and TQCollection doesn't have id property
  })

  return {
    // Data
    collection,
    user,
    tracks,
    currentTrack,
    accountUserId,
    playing,
    previewing,
    status,
    currentQueueItem,
    order,
    playlistUpdates,
    trackCount,
    playlistId,
    // State
    filterText,
    initialOrder,
    allowReordering,
    // Helpers
    isQueued,
    getPlayingUid,
    getPlayingId,
    getFilteredData,
    // Handlers
    onFilterChange,
    onClickRow,
    onClickRepostTrack,
    onClickPurchaseTrack,
    onClickRemove,
    onPlay,
    onPreview,
    onSortTracks,
    onReorderTracks,
    onPublish,
    onHeroTrackShare,
    onHeroTrackSave,
    onHeroTrackRepost,
    onClickReposts,
    onClickFavorites,
    onFollow,
    onUnfollow,
    onClickMobileOverflow,
    refreshCollection,
    // SEO
    ...seoFields
  }
}
