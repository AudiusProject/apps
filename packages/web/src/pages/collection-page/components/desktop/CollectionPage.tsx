import {
  ChangeEvent,
  useCallback,
  useMemo,
  useState,
  useEffect,
  useRef
} from 'react'

import {
  useCollectionByParams,
  useUser,
  useCurrentUserId,
  useFavoriteTrack,
  useUnfavoriteTrack
} from '@audius/common/api'
import { useCurrentTrack } from '@audius/common/hooks'
import {
  Variant,
  Status,
  isContentUSDCPurchaseGated,
  ModalSource,
  Track,
  FavoriteSource,
  Name,
  RepostSource,
  PlaybackSource,
  PlayableType,
  Kind
} from '@audius/common/models'
import {
  CollectionTrack,
  CollectionsPageType,
  CollectionPageTrackRecord,
  usePremiumContentPurchaseModal,
  PurchaseableContentType,
  collectionPageLineupActions as tracksActions,
  collectionPageSelectors,
  collectionPageActions as collectionActions,
  queueSelectors,
  tracksSocialActions as socialTracksActions,
  playerSelectors,
  playerActions,
  cacheCollectionsActions,
  playlistUpdatesActions,
  playlistUpdatesSelectors,
  PlayerBehavior,
  useLineupTable,
  lineupSelectors
} from '@audius/common/store'
import { formatUrlName, route, makeUid, Uid } from '@audius/common/utils'
import { Divider, Flex, Paper, Text } from '@audius/harmony'
import { Id } from '@audius/sdk'
import { useDispatch, useSelector } from 'react-redux'
import { useLocation, useNavigate } from 'react-router-dom'

import { make } from 'common/store/analytics/actions'
import { CollectionDogEar } from 'components/collection'
import { CollectionHeader } from 'components/collection/desktop/CollectionHeader'
import Page from 'components/page/Page'
import { SuggestedTracks } from 'components/suggested-tracks'
import { TracksTable } from 'components/tracks-table'
import { useRequiresAccountCallback } from 'hooks/useRequiresAccount'
import { computeCollectionMetadataProps } from 'pages/collection-page/store/utils'
import DeletedPage from 'pages/deleted-page/DeletedPage'
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

import styles from './CollectionPage.module.css'

const { NOT_FOUND_PAGE } = route
const { getPlaying } = playerSelectors
const { getPlayerBehavior } = queueSelectors
const { getCollectionTracksLineup, getCollectionId, getCollectionPermalink } =
  collectionPageSelectors
const { makeGetLineupOrder } = lineupSelectors
const { makeGetCurrent } = queueSelectors
const { selectAllPlaylistUpdateIds } = playlistUpdatesSelectors
const { removeTrackFromPlaylist, orderPlaylist } = cacheCollectionsActions
const { updatedPlaylistViewed } = playlistUpdatesActions

const messages = {
  noFilterMatches: 'No tracks match your search...'
}

const getMessages = (collectionType: 'album' | 'playlist') => ({
  emptyPage: {
    ownerTitle: 'Nothing here yet',
    ownerCta: 'Start adding tracks',
    visitor: `This ${collectionType} is empty...`
  },
  type: {
    playlist: 'Playlist',
    album: 'Album'
  },
  remove: 'Remove from this'
})

type EmptyContentProps = {
  text?: string | null
  isOwner: boolean
  isAlbum: boolean
}

const EmptyContent = (props: EmptyContentProps) => {
  const { isAlbum, isOwner, text: textProp } = props
  const messages = getMessages(isAlbum ? 'album' : 'playlist')
  return (
    <Flex column p='2xl' alignItems='center' gap='s'>
      <Text variant='title' size='l'>
        {(textProp ?? isOwner)
          ? messages.emptyPage.ownerTitle
          : messages.emptyPage.visitor}
      </Text>
      {isOwner ? <Text size='l'>{messages.emptyPage.ownerCta}</Text> : null}
    </Flex>
  )
}

const NoSearchResultsContent = () => {
  return (
    <Flex column p='2xl' alignItems='center' gap='s'>
      <Text variant='title' size='l'>
        {messages.noFilterMatches}
      </Text>
    </Flex>
  )
}

type CollectionPageProps = {
  type: CollectionsPageType
}

const CollectionPage = ({ type }: CollectionPageProps) => {
  const location = useLocation()
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const pathname = getPathname(location)

  const params = parseCollectionRoute(pathname)
  const { data: collection, status: collectionStatus } =
    useCollectionByParams(params)
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
  const reduxCollectionId = useSelector(getCollectionId)
  const reduxCollectionPermalink = useSelector(getCollectionPermalink)

  const trackCount = collection?.playlist_contents.track_ids.length ?? 0
  const playlistId = collection?.playlist_id

  // State
  const [filterText, setFilterText] = useState('')
  const [initialOrder, setInitialOrder] = useState<string[] | null>(null)
  const [allowReordering, setAllowReordering] = useState(true)
  const [updatingRoute] = useState(false)

  // Effects
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
    if (!collection || !updatingRoute || !collection._moved) return
    const collectionId = Uid.fromString(collection._moved).id as number
    dispatch(
      collectionActions.fetchCollectionSucceeded(
        collectionId,
        collection.permalink ?? '',
        makeUid(Kind.USERS, collection.playlist_owner_id)
      )
    )
    const newPath = pathname.replace(
      `${collection.playlist_id}`,
      collectionId.toString()
    )
    dispatch(replace(newPath))
  }, [collection, updatingRoute, pathname, dispatch])

  // URL normalization
  useEffect(() => {
    if (!collection || !params || !user) return
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
  }, [collection, params, user, pathname, dispatch])

  // Fetch collection on mount/pathname change
  useEffect(() => {
    if (!params) return
    const locationState = location.state as { forceFetch?: boolean } | undefined
    const forceFetch = locationState?.forceFetch
    const { permalink, collectionId } = params

    // Compare against Redux state, not React Query state
    const shouldFetch =
      forceFetch ||
      permalink !== reduxCollectionPermalink ||
      (collectionId && collectionId !== reduxCollectionId)

    if (shouldFetch) {
      dispatch(
        collectionActions.fetchCollection(
          collectionId,
          permalink,
          true, // fetchLineup - this will automatically trigger fetchLineupMetadatas
          forceFetch
        )
      )
    }
  }, [
    params,
    pathname,
    reduxCollectionId,
    reduxCollectionPermalink,
    location.state,
    dispatch
  ])

  // Fetch tracks when collection contents change (only if collection is in Redux)
  const prevCollectionRef = useRef(collection)
  useEffect(() => {
    if (
      collection &&
      prevCollectionRef.current &&
      reduxCollectionId === collection.playlist_id &&
      JSON.stringify(collection.playlist_contents.track_ids) !==
        JSON.stringify(prevCollectionRef.current.playlist_contents.track_ids)
    ) {
      // Only fetch if collection is already in Redux state
      dispatch(tracksActions.fetchLineupMetadatas(0, 200, false, undefined))
    }
    prevCollectionRef.current = collection
  }, [collection, reduxCollectionId, dispatch])

  // Reset collection on unmount
  useEffect(() => {
    return () => {
      dispatch(collectionActions.resetCollection())
    }
  }, [dispatch])

  // Helper functions
  const isQueued = useCallback(() => {
    return tracks.entries.some((entry) => currentQueueItem.uid === entry.uid)
  }, [tracks.entries, currentQueueItem])

  const getPlayingUid = useCallback(() => {
    return currentQueueItem.uid
  }, [currentQueueItem])

  const formatMetadata = useCallback(
    (trackMetadatas: CollectionTrack[]): CollectionPageTrackRecord[] => {
      return trackMetadatas.map((metadata, i) => ({
        ...metadata,
        key: `${metadata.title}_${metadata.uid}_${i}`,
        name: metadata.title,
        artist: metadata.user.name,
        handle: metadata.user.handle,
        date: metadata.dateAdded ?? metadata.created_at,
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

  const onFilterChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setFilterText(e.target.value)
  }, [])

  // Handlers
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

  const { onOpen: openPremiumContentModal } = usePremiumContentPurchaseModal()
  const openPurchaseModal = useRequiresAccountCallback(
    ({ track_id }: Track) => {
      openPremiumContentModal(
        { contentId: track_id, contentType: PurchaseableContentType.TRACK },
        { source: ModalSource.TrackListItem }
      )
    },
    [openPremiumContentModal]
  )

  const onClickRemove = useCallback(
    (trackId: number, _index: number, uid: string, timestamp: number) => {
      if (!collection || !playlistId) return
      if (isContentUSDCPurchaseGated(collection.stream_conditions)) {
        // TODO: Add confirmation modal
        console.warn('Confirmation modal not implemented yet')
      } else {
        dispatch(removeTrackFromPlaylist(trackId, playlistId, timestamp))
        dispatch(tracksActions.remove(Kind.TRACKS, uid))
      }
    },
    [collection, playlistId, dispatch]
  )

  const onPlay = useCallback(
    ({ isPreview = false }: { isPreview?: boolean } = {}) => {
      if (!collection) return
      const isOwner = collection.playlist_owner_id === accountUserId
      const shouldPreview = isPreview && isOwner
      const isQueuedVal = isQueued()
      const playingId = currentTrack?.track_id ?? null

      if (playing && isQueuedVal && previewing === shouldPreview) {
        dispatch(tracksActions.pause())
        dispatch(
          make(Name.PLAYBACK_PAUSE, {
            id: `${playingId}`,
            source: PlaybackSource.PLAYLIST_PAGE
          })
        )
      } else if (!playing && previewing === shouldPreview && isQueuedVal) {
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
      collection,
      accountUserId,
      playing,
      previewing,
      isQueued,
      currentTrack,
      tracks.entries,
      dispatch
    ]
  )

  const onPreview = useCallback(() => {
    onPlay({ isPreview: true })
  }, [onPlay])

  const onSortTracks = useCallback(
    (sorters: any) => {
      const { column, order: sortOrder } = sorters
      const dataSource = formatMetadata(tracks.entries)
      let updatedOrder
      if (!column) {
        updatedOrder = initialOrder
        setAllowReordering(true)
      } else {
        updatedOrder = dataSource
          .sort((a, b) =>
            sortOrder === 'ascend' ? column.sorter(a, b) : column.sorter(b, a)
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

      const trackIdAndTimes = newOrder.map((uid: string) => {
        const entry = tracks.entries[order[uid]]
        return {
          id: entry.track_id,
          time: entry.dateAdded?.unix() ?? 0
        }
      })

      dispatch(tracksActions.updateLineupOrder(newOrder))
      setInitialOrder(newOrder)
      dispatch(orderPlaylist(playlistId, trackIdAndTimes, newOrder))
    },
    [initialOrder, playlistId, tracks.entries, order, dispatch]
  )

  const onClickFavorites = useCallback(() => {
    if (!collection) return
    dispatch(
      setUsers({
        userListType: UserListType.FAVORITE,
        entityType: UserListEntityType.COLLECTION,
        id: collection.playlist_id
      })
    )
    dispatch(setVisibility(true))
  }, [collection, dispatch])

  const onClickReposts = useCallback(() => {
    if (!collection) return
    dispatch(
      setUsers({
        userListType: UserListType.REPOST,
        entityType: UserListEntityType.COLLECTION,
        id: collection.playlist_id
      })
    )
    dispatch(setVisibility(true))
  }, [collection, dispatch])

  const { mutate: favoriteTrack } = useFavoriteTrack()
  const { mutate: unfavoriteTrack } = useUnfavoriteTrack()
  const toggleSaveTrack = useCallback(
    (track: Track) => {
      if (track.has_current_user_saved) {
        unfavoriteTrack({
          trackId: track.track_id,
          source: FavoriteSource.COLLECTION_PAGE
        })
      } else {
        favoriteTrack({
          trackId: track.track_id,
          source: FavoriteSource.COLLECTION_PAGE
        })
      }
    },
    [favoriteTrack, unfavoriteTrack]
  )

  // All hooks must be called before any conditional returns
  // Pre-compute tracksTableColumns with safe defaults
  const tracksTableColumns = useMemo(() => {
    const isAlbum = collection?.is_album ?? false
    const areAllTracksPremium = tracks.entries.every(
      (track) =>
        track.is_stream_gated &&
        isContentUSDCPurchaseGated(track.stream_conditions)
    )
    const columns = [
      'playButton',
      'trackName',
      isAlbum ? undefined : 'artistName',
      isAlbum ? 'date' : 'addedDate',
      'length',
      areAllTracksPremium ? undefined : 'plays',
      'reposts',
      'overflowActions'
    ]
    return columns.filter((c) => c !== undefined)
  }, [collection?.is_album, tracks.entries])

  const collectionLoading = collectionStatus === 'pending'
  const queuedAndPlaying = playing && isQueued()
  const queuedAndPreviewing = previewing && isQueued()
  const tracksLoading =
    trackCount > 0 &&
    (tracks.status === Status.LOADING || tracks.status === Status.IDLE)

  const [dataSource, activeIndex] =
    tracks.status === Status.SUCCESS
      ? getFilteredData(tracks.entries)
      : [[], -1]

  const duration =
    dataSource.reduce(
      (duration: number, entry: CollectionTrack) =>
        duration + (entry.duration ?? 0),
      0
    ) ?? 0

  const playlistOwnerName = user?.name ?? ''
  const playlistOwnerHandle = user?.handle ?? ''
  const playlistOwnerId = user?.user_id ?? null
  const isOwner = accountUserId === playlistOwnerId

  const access = collection?.access ?? null

  const {
    isEmpty,
    lastModifiedDate,
    releaseDate,
    playlistName,
    description,
    isPrivate,
    isAlbum,
    playlistSaveCount,
    playlistRepostCount
  } = computeCollectionMetadataProps(collection ?? null, tracks)
  const numTracks = tracks.entries.length
  const areAllTracksDeleted = tracks.entries.every((track) => track.is_delete)

  // SEO fields
  const {
    title = '',
    description: pageDescription = '',
    canonicalUrl = '',
    structuredData
  } = getCollectionPageSEOFields({
    playlistName: collection?.playlist_name,
    playlistId: collection?.playlist_id,
    userName: user?.name,
    userHandle: user?.handle,
    isAlbum: collection?.is_album,
    permalink: collection?.permalink
  })

  // Handle deleted collection
  if ((collection?.is_delete || collection?._marked_deleted) && user) {
    return (
      <DeletedPage
        title={title}
        description={pageDescription}
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

  const isPlayable = !areAllTracksDeleted && numTracks > 0

  const topSection = (
    <CollectionHeader
      access={access}
      collectionId={playlistId!}
      userId={playlistOwnerId ?? 0}
      loading={collectionLoading}
      tracksLoading={tracksLoading}
      type={type}
      title={playlistName}
      artistName={playlistOwnerName}
      artistHandle={playlistOwnerHandle}
      description={description}
      isOwner={isOwner}
      isAlbum={isAlbum}
      numTracks={numTracks}
      isPlayable={isPlayable}
      lastModifiedDate={lastModifiedDate}
      releaseDate={releaseDate}
      duration={duration}
      isPublished={!isPrivate}
      reposts={playlistRepostCount}
      saves={playlistSaveCount}
      playing={queuedAndPlaying}
      previewing={queuedAndPreviewing}
      onFilterChange={onFilterChange}
      onPlay={() => onPlay({})}
      onPreview={onPreview}
      onClickReposts={onClickReposts}
      onClickFavorites={onClickFavorites}
      ownerId={playlistOwnerId}
      isStreamGated={
        collection?.variant === Variant.USER_GENERATED
          ? collection?.is_stream_gated
          : null
      }
      streamConditions={
        collection?.variant === Variant.USER_GENERATED
          ? collection?.stream_conditions
          : null
      }
    />
  )

  const messagesCollection = getMessages(isAlbum ? 'album' : 'playlist')
  return (
    <Page
      title={title}
      description={pageDescription}
      canonicalUrl={canonicalUrl}
      structuredData={structuredData}
      entityType='collection'
      hashId={playlistId ? Id.parse(playlistId) : undefined}
      containerClassName={styles.pageContainer}
      contentClassName={styles.pageContent}
      fromOpacity={1}
      scrollableSearch
    >
      <Paper column mb='unit-10' css={{ minWidth: 774 }}>
        <CollectionDogEar collectionId={playlistId!} borderOffset={0} />
        <div className={styles.topSectionWrapper}>{topSection}</div>
        {!collectionLoading && isEmpty ? (
          <EmptyContent isOwner={isOwner} isAlbum={isAlbum} text={null} />
        ) : !collectionLoading && dataSource.length === 0 ? (
          <NoSearchResultsContent />
        ) : (
          <div className={styles.tableWrapper}>
            <TracksTable
              // @ts-ignore
              columns={tracksTableColumns}
              wrapperClassName={styles.tracksTableWrapper}
              key={playlistName}
              loading={collectionLoading}
              userId={accountUserId}
              playing={playing}
              activeIndex={activeIndex}
              data={dataSource}
              onClickRow={onClickRow}
              onClickFavorite={toggleSaveTrack}
              onClickRemove={isOwner ? onClickRemove : undefined}
              onClickRepost={onClickRepostTrack}
              onClickPurchase={openPurchaseModal}
              onReorder={onReorderTracks}
              onSort={onSortTracks}
              isReorderable={
                accountUserId !== null &&
                accountUserId === playlistOwnerId &&
                allowReordering
              }
              removeText={`${messagesCollection.remove} ${
                isAlbum
                  ? messagesCollection.type.album
                  : messagesCollection.type.playlist
              }`}
              isAlbumPage={isAlbum}
              isAlbumPremium={
                !!collection && 'is_stream_gated' in collection
                  ? collection?.is_stream_gated
                  : false
              }
            />
          </div>
        )}
      </Paper>

      {!collectionLoading && isOwner && !isAlbum ? (
        <Flex column gap='2xl' pv='2xl' w='100%' css={{ minWidth: 774 }}>
          <Divider />
          <SuggestedTracks collectionId={playlistId!} />
        </Flex>
      ) : null}
    </Page>
  )
}

export default CollectionPage
