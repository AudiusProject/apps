import { memo, useEffect, useContext, useCallback, useRef } from 'react'

import {
  useCollectionByParams,
  useUser,
  useCurrentUserId
} from '@audius/common/api'
import { useCurrentTrack, useGatedContentAccessMap } from '@audius/common/hooks'
import {
  Status,
  ID,
  Name,
  ShareSource,
  RepostSource,
  FavoriteSource,
  PlaybackSource,
  PlayableType,
  Kind,
  FavoriteType
} from '@audius/common/models'
import {
  OverflowAction,
  CollectionTrack,
  CollectionsPageType,
  collectionPageLineupActions as tracksActions,
  collectionPageSelectors,
  collectionPageActions as collectionActions,
  queueSelectors,
  collectionsSocialActions as socialCollectionsActions,
  shareModalUIActions,
  mobileOverflowMenuUIActions,
  playerSelectors,
  playerActions,
  playlistUpdatesActions,
  playlistUpdatesSelectors,
  PlayerBehavior,
  useLineupTable,
  repostsUserListActions,
  favoritesUserListActions,
  OverflowSource,
  RepostType
} from '@audius/common/store'
import { formatUrlName, route, makeUid, Uid } from '@audius/common/utils'
import { Id } from '@audius/sdk'
import { useDispatch, useSelector } from 'react-redux'
import { useLocation, useNavigate } from 'react-router-dom'

import { make } from 'common/store/analytics/actions'
import CollectionHeader from 'components/collection/mobile/CollectionHeader'
import { HeaderContext } from 'components/header/mobile/HeaderContextProvider'
import LoadingSpinner from 'components/loading-spinner/LoadingSpinner'
import MobilePageContainer from 'components/mobile-page-container/MobilePageContainer'
import NavContext, {
  LeftPreset,
  CenterPreset,
  RightPreset
} from 'components/nav/mobile/NavContext'
import TrackList from 'components/track/mobile/TrackList'
import { computeCollectionMetadataProps } from 'pages/collection-page/store/utils'
import DeletedPage from 'pages/deleted-page/DeletedPage'
import { push, replace } from 'utils/navigation'
import { getPathname, collectionPage, profilePage } from 'utils/route'
import { parseCollectionRoute } from 'utils/route/collectionRouteParser'
import { getCollectionPageSEOFields } from 'utils/seo'

import styles from './CollectionPage.module.css'

const { NOT_FOUND_PAGE, REPOSTING_USERS_ROUTE, FAVORITING_USERS_ROUTE } = route
const { getPlaying } = playerSelectors
const { getPlayerBehavior } = queueSelectors
const { getCollectionTracksLineup, getCollectionId, getCollectionPermalink } =
  collectionPageSelectors
const { makeGetCurrent } = queueSelectors
const { requestOpen: requestOpenShareModal } = shareModalUIActions
const { open: openMobileOverflow } = mobileOverflowMenuUIActions
const { selectAllPlaylistUpdateIds } = playlistUpdatesSelectors
const { updatedPlaylistViewed } = playlistUpdatesActions
const { setFavorite } = favoritesUserListActions
const { setRepost } = repostsUserListActions

const messages = {
  emptyPlaylist: (collectionType: 'album' | 'playlist') =>
    `This ${collectionType} is empty...`
}

const EmptyTrackList = ({
  isAlbum,
  customEmptyText
}: {
  isAlbum: boolean
  customEmptyText?: string | null
}) => {
  return (
    <div className={styles.emptyListContainer}>
      <div>
        {customEmptyText ||
          messages.emptyPlaylist(isAlbum ? 'album' : 'playlist')}
      </div>
    </div>
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
  const playlistUpdates = useSelector(selectAllPlaylistUpdateIds)
  const reduxCollectionId = useSelector(getCollectionId)
  const reduxCollectionPermalink = useSelector(getCollectionPermalink)

  const playlistId = collection?.playlist_id

  // Nav context
  const { setLeft, setCenter, setRight } = useContext(NavContext)!
  useEffect(() => {
    if (collection) {
      if (collection.is_delete || collection._marked_deleted) {
        return
      }
      setLeft(LeftPreset.BACK)
      setRight(RightPreset.KEBAB)
      setCenter(CenterPreset.LOGO)
    }
  }, [setLeft, setCenter, setRight, collection])

  const { setHeader } = useContext(HeaderContext)
  useEffect(() => {
    setHeader(null)
  }, [setHeader])

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
    if (!collection || !collection._moved) return
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
  }, [collection, pathname, dispatch])

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

  // Helper functions
  const isQueued = useCallback(() => {
    return tracks.entries.some((entry) => currentQueueItem.uid === entry.uid)
  }, [tracks.entries, currentQueueItem])

  const getPlayingUid = useCallback(() => {
    return currentQueueItem.uid
  }, [currentQueueItem])

  // Handlers
  const onClickRow = useCallback(
    (record: { uid: string; track_id: ID }) => {
      const playingUid = getPlayingUid()
      if (playing && playingUid === record.uid) {
        dispatch(tracksActions.pause())
        dispatch(
          make(Name.PLAYBACK_PAUSE, {
            id: `${record.track_id}`,
            source: PlaybackSource.PLAYLIST_TRACK
          })
        )
      } else if (playingUid !== record.uid) {
        dispatch(tracksActions.play(record.uid))
        dispatch(
          make(Name.PLAYBACK_PLAY, {
            id: `${record.track_id}`,
            source: PlaybackSource.PLAYLIST_TRACK
          })
        )
      } else {
        dispatch(tracksActions.play())
        dispatch(
          make(Name.PLAYBACK_PLAY, {
            id: `${record.track_id}`,
            source: PlaybackSource.PLAYLIST_TRACK
          })
        )
      }
    },
    [playing, getPlayingUid, dispatch]
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

  const onHeroTrackShare = useCallback(() => {
    if (!playlistId) return
    dispatch(
      requestOpenShareModal({
        type: 'collection',
        collectionId: playlistId,
        source: ShareSource.TILE
      })
    )
  }, [playlistId, dispatch])

  const onHeroTrackSave = useCallback(() => {
    if (!collection || !playlistId) return
    const isSaved = collection.has_current_user_saved
    if (isSaved) {
      dispatch(
        socialCollectionsActions.unsaveCollection(
          playlistId,
          FavoriteSource.COLLECTION_PAGE
        )
      )
    } else {
      dispatch(
        socialCollectionsActions.saveCollection(
          playlistId,
          FavoriteSource.COLLECTION_PAGE
        )
      )
    }
  }, [collection, playlistId, dispatch])

  const onHeroTrackRepost = useCallback(() => {
    if (!collection || !playlistId) return
    const isReposted = collection.has_current_user_reposted
    if (isReposted) {
      dispatch(
        socialCollectionsActions.undoRepostCollection(
          playlistId,
          RepostSource.COLLECTION_PAGE
        )
      )
    } else {
      dispatch(
        socialCollectionsActions.repostCollection(
          playlistId,
          RepostSource.COLLECTION_PAGE
        )
      )
    }
  }, [collection, playlistId, dispatch])

  const onClickFavorites = useCallback(() => {
    if (!collection) return
    dispatch(setFavorite(collection.playlist_id, FavoriteType.PLAYLIST))
    dispatch(push(FAVORITING_USERS_ROUTE))
  }, [collection, dispatch])

  const onClickReposts = useCallback(() => {
    if (!collection) return
    dispatch(setRepost(collection.playlist_id, RepostType.COLLECTION))
    dispatch(push(REPOSTING_USERS_ROUTE))
  }, [collection, dispatch])

  const onClickMobileOverflow = useCallback(
    (collectionId: ID, overflowActions: OverflowAction[]) => {
      dispatch(
        openMobileOverflow({
          source: OverflowSource.COLLECTIONS,
          id: collectionId,
          overflowActions
        })
      )
    },
    [dispatch]
  )

  // All hooks must be called before any conditional returns
  const trackAccessMap = useGatedContentAccessMap(tracks.entries)
  const togglePlay = useCallback(
    (uid: string, trackId: ID) => {
      onClickRow({ uid, track_id: trackId })
    },
    [onClickRow]
  )

  // Render logic
  // if (!collection) return null

  const collectionLoading = collectionStatus === 'pending'
  const queuedAndPlaying = playing && isQueued()
  const queuedAndPreviewing = previewing && isQueued()
  const tracksLoading = tracks.status === Status.LOADING
  const duration =
    tracks.entries?.reduce(
      (duration: number, entry: CollectionTrack) =>
        duration + (entry.duration ?? 0),
      0
    ) ?? 0

  const playlistOwnerName = user?.name ?? ''
  const playlistOwnerHandle = user?.handle ?? ''
  const playlistOwnerId = user?.user_id ?? null
  const isOwner = accountUserId === playlistOwnerId

  const isSaved = collection?.has_current_user_saved
  const isPublishing = collection?._is_publishing ?? false
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
    playlistRepostCount,
    isReposted
  } = computeCollectionMetadataProps(collection ?? null, tracks)

  const playingUid = getPlayingUid()
  const trackList = tracks.entries.map((entry) => {
    const { isFetchingNFTAccess, hasStreamAccess } = trackAccessMap[
      entry.track_id
    ] ?? { isFetchingNFTAccess: false, hasStreamAccess: true }
    const isLocked = !isFetchingNFTAccess && !hasStreamAccess
    return {
      isLoading: false,
      isUnlisted: entry.is_unlisted,
      isSaved: entry.has_current_user_saved,
      isReposted: entry.has_current_user_reposted,
      isActive: playingUid === entry.uid,
      isPlaying: queuedAndPlaying && playingUid === entry.uid,
      artistName: entry?.user?.name,
      artistHandle: entry?.user?.handle,
      trackTitle: entry.title,
      ddexApp: entry.ddex_app,
      permalink: entry.permalink,
      trackId: entry.track_id,
      uid: entry.uid,
      isStreamGated: entry.is_stream_gated,
      isDeleted: entry.is_delete || !!entry?.user?.is_deactivated,
      isLocked,
      hasStreamAccess,
      streamConditions: entry.stream_conditions
    }
  })
  const numTracks = trackList.length
  const areAllTracksDeleted = trackList.every((track) => track.isDeleted)
  const isPlayable = !areAllTracksDeleted && numTracks > 0

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

  return (
    <MobilePageContainer
      title={title}
      description={pageDescription}
      canonicalUrl={canonicalUrl}
      structuredData={structuredData}
      entityType='collection'
      hashId={playlistId ? Id.parse(playlistId) : undefined}
    >
      <div className={styles.collectionContent}>
        <div>
          <CollectionHeader
            access={access}
            collectionId={playlistId!}
            userId={user?.user_id ?? 0}
            loading={collectionLoading}
            tracksLoading={tracksLoading}
            type={type}
            ddexApp={collection?.ddex_app}
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
            isPublishing={isPublishing}
            isSaved={isSaved}
            saves={playlistSaveCount}
            playing={queuedAndPlaying}
            previewing={queuedAndPreviewing}
            reposts={playlistRepostCount}
            isReposted={isReposted}
            isStreamGated={collection?.is_stream_gated ?? null}
            streamConditions={collection?.stream_conditions ?? null}
            ownerId={playlistOwnerId}
            onPlay={() => onPlay({})}
            onPreview={onPreview}
            onShare={onHeroTrackShare}
            onSave={onHeroTrackSave}
            onRepost={onHeroTrackRepost}
            onClickFavorites={onClickFavorites}
            onClickReposts={onClickReposts}
            onClickMobileOverflow={onClickMobileOverflow}
          />
        </div>
        <div className={styles.collectionTracksContainer}>
          {!tracksLoading ? (
            isEmpty ? (
              <>
                <div className={styles.divider}></div>
                <EmptyTrackList isAlbum={isAlbum} customEmptyText={null} />
              </>
            ) : (
              <TrackList
                containerClassName={''}
                itemClassName={''}
                tracks={trackList}
                showDivider
                togglePlay={togglePlay}
              />
            )
          ) : null}
          {collectionLoading ? (
            <LoadingSpinner className={styles.spinner} />
          ) : null}
        </div>
      </div>
    </MobilePageContainer>
  )
}

export default memo(CollectionPage)
