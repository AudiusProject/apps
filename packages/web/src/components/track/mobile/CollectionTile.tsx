import { useEffect, MouseEvent, useCallback, useMemo } from 'react'

import {
  CollectionTrackWithUid,
  useUser,
  useCollection,
  useCollectionTracksWithUid,
  useCurrentUserId
} from '@audius/common/api'
import {
  ID,
  UID,
  ModalSource,
  isContentUSDCPurchaseGated,
  Name,
  ShareSource,
  RepostSource,
  FavoriteSource,
  PlaybackSource,
  Track
} from '@audius/common/models'
import {
  gatedContentActions,
  PurchaseableContentType,
  usePremiumContentPurchaseModal,
  collectionsSocialActions,
  mobileOverflowMenuUIActions,
  shareModalUIActions,
  OverflowAction,
  OverflowSource,
  playerSelectors
} from '@audius/common/store'
import { formatLineupTileDuration, route } from '@audius/common/utils'
import {
  Box,
  Flex,
  IconVolumeLevel2 as IconVolume,
  Text
} from '@audius/harmony'
import cn from 'classnames'
import { range } from 'lodash'
import { useDispatch, useSelector } from 'react-redux'

import { useModalState } from 'common/hooks/useModalState'
import { useRecord, make } from 'common/store/analytics/actions'
import { CollectionDogEar } from 'components/collection'
import { CollectionTileStats } from 'components/collection/CollectionTileStats'
import { TextLink, UserLink } from 'components/link'
import Skeleton from 'components/skeleton/Skeleton'
import { TrackTileSize } from 'components/track/types'
import { useRequiresAccountOnClick } from 'hooks/useRequiresAccount'
import { push } from 'utils/navigation'
import { useIsDarkMode, useIsMatrix } from 'utils/theme/theme'

import { DesktopCollectionTileProps } from '../desktop/CollectionTile'
import { getCollectionWithFallback } from '../helpers'

import BottomButtons from './BottomButtons'
import styles from './PlaylistTile.module.css'
import TrackTileArt from './TrackTileArt'

const { collectionPage } = route
const { getUid, getBuffering, getPlaying } = playerSelectors
const { requestOpen: requestOpenShareModal } = shareModalUIActions
const { open } = mobileOverflowMenuUIActions
const {
  saveCollection,
  unsaveCollection,
  repostCollection,
  undoRepostCollection
} = collectionsSocialActions
const { setLockedContentId } = gatedContentActions

type OwnProps = Omit<
  DesktopCollectionTileProps,
  | 'userId'
  | 'duration'
  | 'artistName'
  | 'genre'
  | 'artistHandle'
  | 'isPublic'
  | 'repostCount'
  | 'saveCount'
  | 'trackCount'
  | 'ownerId'
  | 'isActive'
  | 'isPlaying'
  | 'contentTitle'
  | 'activeTrackUid'
  | 'followeeReposts'
  | 'followeeSaves'
  | 'hasCurrentUserReposted'
  | 'hasCurrentUserSaved'
  | 'isAlbum'
  | 'playlistTitle'
  | 'artistIsVerified'
  | 'goToRoute'
> & {
  collection?: any
  uploading?: boolean
  user?: any
  variant?: 'readonly'
}

type TrackItemProps = {
  index: number
  track?: CollectionTrackWithUid
  isAlbum: boolean
  active: boolean
  deleted?: boolean
  forceSkeleton?: boolean
  noShimmer?: boolean
}

// Max number of track to display in a playlist
const DISPLAY_TRACK_COUNT = 5

const messages = {
  by: 'by',
  deleted: '[Deleted by Artist]',
  hidden: 'Hidden'
}

const TrackItem = (props: TrackItemProps) => {
  const { active, deleted, index, isAlbum, track, forceSkeleton, noShimmer } =
    props
  const { data: trackOwnerName } = useUser(track?.owner_id, {
    select: (user) => user?.name
  })

  return (
    <>
      <div className={styles.trackItemDivider}></div>
      <div
        className={cn(styles.trackItem, {
          [styles.deletedTrackItem]: deleted,
          [styles.activeTrackItem]: active
        })}
      >
        {forceSkeleton ? (
          <Skeleton width='100%' height='10px' noShimmer={noShimmer} />
        ) : track ? (
          <>
            <div className={styles.index}> {index + 1} </div>
            <div className={styles.trackTitle}> {track.title} </div>
            {!isAlbum ? (
              <div className={styles.byArtist}>
                {' '}
                {`${messages.by} ${trackOwnerName}`}{' '}
              </div>
            ) : null}
            {deleted ? (
              <div className={styles.deletedTrack}>{messages.deleted}</div>
            ) : null}
          </>
        ) : null}
      </div>
    </>
  )
}

type TrackListProps = {
  activeTrackUid: UID | null
  tracks: CollectionTrackWithUid[]
  goToCollectionPage: (e: MouseEvent<HTMLElement>) => void
  isLoading?: boolean
  isAlbum: boolean
  numLoadingSkeletonRows?: number
  trackCount?: number
  noShimmer?: boolean
}

const TrackList = ({
  tracks,
  activeTrackUid,
  goToCollectionPage,
  isLoading,
  isAlbum,
  numLoadingSkeletonRows,
  trackCount,
  noShimmer
}: TrackListProps) => {
  if (!tracks.length && isLoading && numLoadingSkeletonRows) {
    return (
      <Box backgroundColor='surface1'>
        {range(numLoadingSkeletonRows).map((i) => (
          <TrackItem
            key={i}
            active={false}
            index={i}
            isAlbum={isAlbum}
            forceSkeleton
            noShimmer={noShimmer}
          />
        ))}
      </Box>
    )
  }

  return (
    <Box backgroundColor='surface1' onClick={goToCollectionPage}>
      {tracks.slice(0, DISPLAY_TRACK_COUNT).map((track, index) => (
        <TrackItem
          key={track.uid}
          active={activeTrackUid === track.uid}
          deleted={track.is_delete}
          index={index}
          isAlbum={isAlbum}
          track={track}
        />
      ))}
      {trackCount && trackCount > DISPLAY_TRACK_COUNT ? (
        <>
          <div className={styles.trackItemDivider}></div>
          <div className={cn(styles.trackItem, styles.trackItemMore)}>
            {`+${trackCount - DISPLAY_TRACK_COUNT} more tracks`}
          </div>
        </>
      ) : null}
    </Box>
  )
}

export const CollectionTile = ({
  uid,
  id,
  index,
  size,
  playTrack,
  pauseTrack,
  isLoading,
  numLoadingSkeletonRows,
  hasLoaded,
  playingTrackId,
  uploading,
  isTrending,
  variant,
  containerClassName,
  isFeed = false,
  source,
  noShimmer
}: OwnProps) => {
  const dispatch = useDispatch()

  const { data: collectionWithoutFallback } = useCollection(id)
  const collection = getCollectionWithFallback(collectionWithoutFallback)
  const tracks = useCollectionTracksWithUid(collectionWithoutFallback, uid)
  const { data: partialUser } = useUser(collection?.playlist_owner_id, {
    select: (user) => ({
      handle: user?.handle,
      name: user?.name,
      is_verified: user?.is_verified
    })
  })
  const { handle } = partialUser ?? {}
  const { data: currentUserId } = useCurrentUserId()
  const playingUid = useSelector(getUid)
  const isBuffering = useSelector(getBuffering)
  const isPlaying = useSelector(getPlaying)
  const darkMode = useIsDarkMode()
  const isMatrixMode = useIsMatrix()

  const goToRoute = useCallback(
    (route: string) => {
      dispatch(push(route))
    },
    [dispatch]
  )

  const shareCollection = useCallback(
    (collectionId: ID) => {
      dispatch(
        requestOpenShareModal({
          type: 'collection',
          collectionId,
          source: ShareSource.TILE
        })
      )
    },
    [dispatch]
  )

  const handleSaveCollection = useCallback(
    (collectionId: ID, isFeed: boolean) => {
      dispatch(saveCollection(collectionId, FavoriteSource.TILE, isFeed))
    },
    [dispatch]
  )

  const handleUnsaveCollection = useCallback(
    (collectionId: ID) => {
      dispatch(unsaveCollection(collectionId, FavoriteSource.TILE))
    },
    [dispatch]
  )

  const handleRepostCollection = useCallback(
    (collectionId: ID, isFeed: boolean) => {
      dispatch(repostCollection(collectionId, RepostSource.TILE, isFeed))
    },
    [dispatch]
  )

  const handleUnrepostCollection = useCallback(
    (collectionId: ID) => {
      dispatch(undoRepostCollection(collectionId, RepostSource.TILE))
    },
    [dispatch]
  )

  const clickOverflow = useCallback(
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

  const record = useRecord()
  const isActive = useMemo(() => {
    return tracks?.some((track) => track.uid === playingUid) ?? false
  }, [tracks, playingUid])
  const hasStreamAccess = !!collection?.access?.stream

  const isOwner = collection.playlist_owner_id === currentUserId

  const toggleSave = useCallback(() => {
    if (collection.has_current_user_saved) {
      handleUnsaveCollection(collection.playlist_id)
    } else {
      handleSaveCollection(collection.playlist_id, isFeed)
    }
  }, [collection, handleUnsaveCollection, handleSaveCollection, isFeed])

  const toggleRepost = useCallback(() => {
    if (collection.has_current_user_reposted) {
      handleUnrepostCollection(collection.playlist_id)
    } else {
      handleRepostCollection(collection.playlist_id, isFeed)
    }
  }, [collection, handleUnrepostCollection, handleRepostCollection, isFeed])

  const getRoute = useCallback(() => {
    return collectionPage(
      handle,
      collection.playlist_name,
      collection.playlist_id,
      collection.permalink,
      collection.is_album
    )
  }, [
    collection.is_album,
    collection.permalink,
    collection.playlist_id,
    collection.playlist_name,
    handle
  ])

  const goToCollectionPage = useCallback(
    (e: MouseEvent<HTMLElement>) => {
      e.stopPropagation()
      const route = getRoute()
      goToRoute(route)
    },
    [goToRoute, getRoute]
  )

  const onShare = useCallback(
    (e?: MouseEvent) => {
      e?.stopPropagation()
      shareCollection(collection.playlist_id)
    },
    [shareCollection, collection.playlist_id]
  )

  const onClickOverflow = useCallback(() => {
    const overflowActions = [
      hasStreamAccess
        ? collection.has_current_user_reposted
          ? OverflowAction.UNREPOST
          : OverflowAction.REPOST
        : null,
      hasStreamAccess
        ? collection.has_current_user_saved && hasStreamAccess
          ? OverflowAction.UNFAVORITE
          : OverflowAction.FAVORITE
        : null,
      collection.is_album
        ? OverflowAction.VIEW_ALBUM_PAGE
        : OverflowAction.VIEW_PLAYLIST_PAGE,
      isOwner ? OverflowAction.PUBLISH_PLAYLIST : null,
      isOwner
        ? collection.is_album
          ? OverflowAction.DELETE_ALBUM
          : OverflowAction.DELETE_PLAYLIST
        : null,
      OverflowAction.VIEW_ARTIST_PAGE
    ].filter(Boolean)

    clickOverflow(
      collection.playlist_id,
      // @ts-ignore
      overflowActions
    )
  }, [hasStreamAccess, collection, isOwner, clickOverflow])

  const togglePlay = useCallback(() => {
    if (uploading) return

    const source = variant
      ? PlaybackSource.CHAT_PLAYLIST_TRACK
      : PlaybackSource.PLAYLIST_TILE_TRACK

    if (!isPlaying || !isActive) {
      if (isActive) {
        playTrack(playingUid!)
        record(
          make(Name.PLAYBACK_PLAY, {
            id: `${playingTrackId}`,
            source
          })
        )
      } else {
        const trackUid = tracks[0] ? tracks[0].uid : null
        const trackId = tracks[0] ? tracks[0].track_id : null
        if (!trackUid || !trackId) return
        playTrack(trackUid)
        record(
          make(Name.PLAYBACK_PLAY, {
            id: `${trackId}`,
            source
          })
        )
      }
    } else {
      pauseTrack()
      record(
        make(Name.PLAYBACK_PAUSE, {
          id: `${playingTrackId}`,
          source
        })
      )
    }
  }, [
    variant,
    isPlaying,
    tracks,
    playTrack,
    pauseTrack,
    isActive,
    playingUid,
    playingTrackId,
    uploading,
    record
  ])

  // Original CollectionTile logic
  useEffect(() => {
    if (!isLoading) {
      hasLoaded?.(index)
    }
  }, [hasLoaded, index, isLoading])

  const isReadonly = variant === 'readonly'
  const shouldShow = !isLoading
  const fadeIn = {
    [styles.show]: shouldShow,
    [styles.hide]: !shouldShow
  }

  const [, setModalVisibility] = useModalState('LockedContent')
  const openLockedContentModal = useCallback(() => {
    if (id) {
      dispatch(setLockedContentId({ id }))
      setModalVisibility(true)
    }
  }, [dispatch, id, setModalVisibility])

  const { onOpen: openPremiumContentPurchaseModal } =
    usePremiumContentPurchaseModal()
  const isPurchase = isContentUSDCPurchaseGated(collection?.stream_conditions)

  const onClickGatedUnlockPill = useRequiresAccountOnClick(() => {
    if (isPurchase && id) {
      openPremiumContentPurchaseModal(
        { contentId: id, contentType: PurchaseableContentType.ALBUM },
        { source: source ?? ModalSource.TrackTile }
      )
    } else if (id && !hasStreamAccess) {
      openLockedContentModal()
    }
  }, [
    isPurchase,
    id,
    openPremiumContentPurchaseModal,
    hasStreamAccess,
    openLockedContentModal
  ])

  if (!collection) {
    return null
  }

  const duration = tracks.reduce(
    (duration: number, track: Track) => duration + track.duration,
    0
  )

  return (
    <div
      className={cn(
        styles.container,
        { [styles.readonly]: isReadonly },
        containerClassName
      )}
    >
      <CollectionDogEar collectionId={id} borderOffset={0} hideUnlocked />
      <div
        css={{ overflow: 'hidden' }}
        className={styles.mainContent}
        onClick={togglePlay}
      >
        <Text
          className={cn(styles.duration, fadeIn)}
          variant='body'
          size='xs'
          strength='default'
          color='subdued'
        >
          {formatLineupTileDuration(duration, false, /* isCollection */ true)}
        </Text>

        <div className={styles.metadata}>
          <TrackTileArt
            id={id}
            isTrack={false}
            showSkeleton={isLoading}
            noShimmer={noShimmer}
            className={styles.albumArtContainer}
            isPlaying={isActive && isPlaying}
            isBuffering={isActive && isBuffering}
            artworkIconClassName={styles.artworkIcon}
          />
          <Flex
            direction='column'
            justifyContent='center'
            gap='2xs'
            mt='m'
            mr='m'
            flex='0 1 65%'
            css={{ overflow: 'hidden' }}
          >
            <TextLink
              to={collection.permalink ?? ''}
              textVariant='title'
              isActive={isActive}
              applyHoverStylesToInnerSvg
            >
              <Text ellipses className={cn(fadeIn)}>
                {collection.playlist_name}
              </Text>
              {isActive && isPlaying ? <IconVolume size='m' /> : null}
              {!shouldShow ? (
                <Skeleton
                  className={styles.skeleton}
                  height='20px'
                  noShimmer={noShimmer}
                />
              ) : null}
            </TextLink>
            <UserLink
              userId={collection.playlist_owner_id}
              badgeSize='xs'
              css={{ marginTop: '-4px' }}
            >
              {!shouldShow ? (
                <Skeleton
                  className={styles.skeleton}
                  height='20px'
                  noShimmer={noShimmer}
                />
              ) : null}
            </UserLink>
          </Flex>
        </div>
        <Box ph='s'>
          <CollectionTileStats
            collectionId={id}
            isTrending={isTrending}
            rankIndex={index}
            size={TrackTileSize.SMALL}
          />
        </Box>
        <TrackList
          activeTrackUid={playingUid || null}
          goToCollectionPage={goToCollectionPage}
          tracks={tracks}
          isLoading={isLoading}
          isAlbum={collection.is_album}
          numLoadingSkeletonRows={numLoadingSkeletonRows}
          trackCount={collection.track_count}
          noShimmer={noShimmer}
        />
        {!isReadonly ? (
          <div className={cn(fadeIn)}>
            <BottomButtons
              hasSaved={collection.has_current_user_saved}
              hasReposted={collection.has_current_user_reposted}
              toggleSave={toggleSave}
              toggleRepost={toggleRepost}
              onShare={onShare}
              onClickOverflow={onClickOverflow}
              onClickGatedUnlockPill={onClickGatedUnlockPill}
              isLoading={isActive && isBuffering}
              isOwner={isOwner}
              isDarkMode={darkMode}
              isMatrixMode={isMatrixMode}
              hasStreamAccess={hasStreamAccess}
              streamConditions={collection.stream_conditions}
              isUnlisted={collection.is_private}
              contentId={id}
              contentType='playlist'
            />
          </div>
        ) : null}
      </div>
    </div>
  )
}
