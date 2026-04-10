import { useMemo, useCallback, useEffect, useRef, MouseEvent } from 'react'

import {
  useCollection,
  useUser,
  useCollectionTracksWithUid,
  useCurrentUserId
} from '@audius/common/api'
import {
  ShareSource,
  RepostSource,
  FavoriteSource,
  ID,
  UID,
  Track,
  isContentUSDCPurchaseGated,
  ModalSource,
  Name,
  PlaybackSource
} from '@audius/common/models'
import {
  collectionsSocialActions,
  shareModalUIActions,
  playerSelectors,
  usePremiumContentPurchaseModal,
  PurchaseableContentType
} from '@audius/common/store'
import { formatLineupTileDuration, route } from '@audius/common/utils'
import {
  Scrollbar,
  IconArrowRight as IconArrow,
  Box,
  Paper,
  Text,
  IconKebabHorizontal,
  Flex,
  IconCrown,
  IconButton,
  IconVolumeLevel2 as IconVolume
} from '@audius/harmony'
import { LocationState } from 'history'
import { range } from 'lodash'
import { useSelector, useDispatch } from 'react-redux'

import { TrackEvent, make } from 'common/store/analytics/actions'
import { CollectionTileStats } from 'components/collection/CollectionTileStats'
import { Draggable } from 'components/dragndrop'
import { TextLink, UserLink } from 'components/link'
import { OwnProps as CollectionMenuProps } from 'components/menu/CollectionMenu'
import Menu from 'components/menu/Menu'
import Skeleton from 'components/skeleton/Skeleton'
import { CollectionArtwork } from 'components/track/Artwork'
import { TrackTileSize } from 'components/track/types'
import { useRequiresAccountOnClick } from 'hooks/useRequiresAccount'
import { isDescendantElementOf } from 'utils/domUtils'
import { push as pushRoute } from 'utils/navigation'
import { fullTrackPage } from 'utils/route'
import { useIsDarkMode, useIsMatrix } from 'utils/theme/theme'

import { OwnerActionButtons } from '../OwnerActionButtons'
import { ViewerActionButtons } from '../ViewerActionButtons'
import { getCollectionWithFallback } from '../helpers'

import TrackListItem from './TrackListItem'

const { getUid, getBuffering, getPlaying } = playerSelectors
const { requestOpen: requestOpenShareModal } = shareModalUIActions
const {
  saveCollection,
  unsaveCollection,
  repostCollection,
  undoRepostCollection
} = collectionsSocialActions
const { collectionPage } = route

export type DesktopCollectionTileProps = {
  uid: UID
  id: ID
  ordered: boolean
  index: number
  size: TrackTileSize
  containerClassName?: string
  togglePlay: (uid: UID, id: ID) => void
  playTrack: (uid: string) => void
  playingTrackId?: ID
  pauseTrack: () => void
  isUploading?: boolean
  isLoading: boolean
  hasLoaded: (index: number) => void
  numLoadingSkeletonRows?: number
  isTrending: boolean
  isFeed?: boolean
  source?: ModalSource
  noShimmer?: boolean
}

export const CollectionTile = ({
  uid,
  id: collectionId,
  ordered,
  index,
  size,
  containerClassName,
  togglePlay,
  playTrack,
  pauseTrack,
  playingTrackId,
  isLoading,
  numLoadingSkeletonRows,
  isUploading,
  hasLoaded,
  isTrending,
  isFeed = false,
  source,
  noShimmer
}: DesktopCollectionTileProps) => {
  const dispatch = useDispatch()
  const isDarkMode = useIsDarkMode()
  const isMatrixMode = useIsMatrix()

  const { data: partialCollection } = useCollection(collectionId, {
    select: (collection) => ({
      playlist_contents: collection?.playlist_contents,
      trackIds: collection?.trackIds,
      playlist_owner_id: collection?.playlist_owner_id,
      is_album: collection?.is_album,
      playlist_name: collection?.playlist_name,
      playlist_id: collection?.playlist_id,
      is_private: collection?.is_private,
      has_current_user_reposted: collection?.has_current_user_reposted,
      has_current_user_saved: collection?.has_current_user_saved,
      track_count: collection?.track_count,
      permalink: collection?.permalink,
      is_stream_gated: collection?.is_stream_gated,
      stream_conditions: collection?.stream_conditions,
      access: collection?.access
    })
  })
  const {
    is_album: isAlbum,
    playlist_name: title,
    playlist_id: id,
    is_private: isUnlisted,
    has_current_user_reposted: isReposted,
    has_current_user_saved: isFavorited,
    track_count: trackCount,
    permalink,
    is_stream_gated: isStreamGated,
    stream_conditions: streamConditions,
    access,
    playlist_owner_id
  } = getCollectionWithFallback(partialCollection)

  const tracks = useCollectionTracksWithUid(partialCollection, uid)
  const { data: currentUserId } = useCurrentUserId()
  const { data: partialUser } = useUser(playlist_owner_id, {
    select: (user) => ({
      is_deactivated: user?.is_deactivated,
      handle: user?.handle,
      user_id: user?.user_id
    })
  })
  const {
    is_deactivated: isOwnerDeactivated,
    handle = '',
    user_id
  } = partialUser ?? {}

  const playingUid = useSelector(getUid)
  const isBuffering = useSelector(getBuffering)
  const isPlaying = useSelector(getPlaying)

  const goToRoute = useCallback(
    (route: string, state?: LocationState) => dispatch(pushRoute(route, state)),
    [dispatch]
  )

  const record = useCallback((event: TrackEvent) => dispatch(event), [dispatch])

  const shareCollection = useCallback(
    (id: ID) =>
      dispatch(
        requestOpenShareModal({
          type: 'collection',
          collectionId: id,
          source: ShareSource.TILE
        })
      ),
    [dispatch]
  )

  const handleRepostCollection = useCallback(
    (id: ID, isFeed: boolean) =>
      dispatch(repostCollection(id, RepostSource.TILE, isFeed)),
    [dispatch]
  )

  const handleUndoRepostCollection = useCallback(
    (id: ID) => dispatch(undoRepostCollection(id, RepostSource.TILE)),
    [dispatch]
  )

  const handleSaveCollection = useCallback(
    (id: ID, isFeed: boolean) =>
      dispatch(saveCollection(id, FavoriteSource.TILE, isFeed)),
    [dispatch]
  )

  const handleUnsaveCollection = useCallback(
    (id: ID) => dispatch(unsaveCollection(id, FavoriteSource.TILE)),
    [dispatch]
  )

  const isOwner = currentUserId === user_id

  const menuRef = useRef<HTMLDivElement>(null)

  const isActive = useMemo(() => {
    return tracks.some((track: any) => track.uid === playingUid)
  }, [tracks, playingUid])
  const { onOpen: openPremiumContentPurchaseModal } =
    usePremiumContentPurchaseModal()

  const isCollectionPlaying = isActive && isPlaying

  const onTogglePlay = useCallback(
    (e?: MouseEvent /* click event within TrackTile */) => {
      // Skip playing / pausing track if click event happened within track menu container
      // because clicking on it should not affect corresponding playlist track.
      // We have to do this instead of stopping the event propagation
      // because we need it to bubble up to the document to allow
      // the document click listener to close other track/playlist tile menus
      // that are already open.
      const shouldSkipTogglePlay = isDescendantElementOf(
        e?.target,
        menuRef.current
      )
      if (shouldSkipTogglePlay) return
      if (isUploading) return
      if (!isActive || !isPlaying) {
        if (isActive) {
          playTrack(playingUid!)
          if (record) {
            record(
              make(Name.PLAYBACK_PLAY, {
                id: `${playingTrackId}`,
                source: PlaybackSource.PLAYLIST_TILE_TRACK,
                collectionId: `${id}`
              })
            )
            record(
              make(Name.PLAYLIST_PLAY, {
                id: `${id}`,
                source: PlaybackSource.PLAYLIST_TILE_TRACK,
                isAlbum: !!isAlbum,
                trackCount
              })
            )
          }
        } else {
          const trackUid = tracks[0] ? tracks[0].uid : null
          const trackId = tracks[0] ? tracks[0].track_id : null
          if (!trackUid || !trackId) return
          playTrack(trackUid)
          if (record) {
            record(
              make(Name.PLAYBACK_PLAY, {
                id: `${trackId}`,
                source: PlaybackSource.PLAYLIST_TILE_TRACK,
                collectionId: `${id}`
              })
            )
            record(
              make(Name.PLAYLIST_PLAY, {
                id: `${id}`,
                source: PlaybackSource.PLAYLIST_TILE_TRACK,
                isAlbum: !!isAlbum,
                trackCount
              })
            )
          }
        }
      } else {
        pauseTrack()
        if (record) {
          record(
            make(Name.PLAYBACK_PAUSE, {
              id: `${playingTrackId}`,
              source: PlaybackSource.PLAYLIST_TILE_TRACK
            })
          )
        }
      }
    },
    [
      isPlaying,
      tracks,
      playTrack,
      pauseTrack,
      isActive,
      playingUid,
      playingTrackId,
      isUploading,
      id,
      isAlbum,
      trackCount,
      record
    ]
  )

  const href = isLoading
    ? ''
    : collectionPage(handle, title, id, permalink, isAlbum)

  const renderOverflowMenu = () => {
    const menu: Omit<CollectionMenuProps, 'children'> = {
      handle: handle ?? '',
      isFavorited,
      isReposted,
      type: isAlbum ? 'album' : 'playlist', // playlist or album
      playlistId: id,
      playlistName: title,
      isPublic: !isUnlisted,
      isOwner,
      includeEmbed: !isUnlisted && !isStreamGated,
      includeShare: true,
      includeRepost: hasStreamAccess,
      includeFavorite: hasStreamAccess,
      includeVisitPage: true,
      extraMenuItems: [],
      permalink: permalink || ''
    }

    return (
      <Menu menu={menu}>
        {(ref, triggerPopup) => (
          <IconButton
            size={size === TrackTileSize.LARGE ? 'l' : 'm'}
            aria-label='More options'
            onClick={(e) => {
              e.stopPropagation()
              triggerPopup()
            }}
            icon={IconKebabHorizontal}
            color='subdued'
            ref={ref}
          />
        )}
      </Menu>
    )
  }

  const onClickFavorite = useCallback(() => {
    if (isFavorited) {
      handleUnsaveCollection(id)
    } else {
      handleSaveCollection(id, isFeed)
    }
  }, [handleSaveCollection, handleUnsaveCollection, id, isFavorited, isFeed])

  const onClickRepost = useCallback(() => {
    if (isReposted) {
      handleUndoRepostCollection(id)
    } else {
      handleRepostCollection(id, isFeed)
    }
  }, [
    handleRepostCollection,
    handleUndoRepostCollection,
    id,
    isReposted,
    isFeed
  ])

  const onClickShare = useCallback(
    (e?: MouseEvent) => {
      e?.stopPropagation()
      shareCollection(id)
    },
    [shareCollection, id]
  )

  const hasStreamAccess = !!access?.stream

  const onClickGatedUnlockPill = useRequiresAccountOnClick(() => {
    const isPurchase = isContentUSDCPurchaseGated(streamConditions)
    if (isPurchase && id) {
      openPremiumContentPurchaseModal(
        { contentId: id, contentType: PurchaseableContentType.ALBUM },
        { source: source ?? ModalSource.TrackTile }
      )
    }
  }, [id, openPremiumContentPurchaseModal, hasStreamAccess])

  const disableActions = false

  const renderTrackList = useCallback(() => {
    const showSkeletons = !!(
      !tracks?.length &&
      isLoading &&
      numLoadingSkeletonRows
    )
    if (showSkeletons) {
      return range(numLoadingSkeletonRows as number).map((i) => (
        <TrackListItem
          index={i}
          key={i}
          isLoading={true}
          isAlbum={isAlbum}
          forceSkeleton
          noShimmer={noShimmer}
          active={false}
          size={size}
          disableActions={disableActions}
          playing={isPlaying}
          togglePlay={togglePlay}
          goToRoute={goToRoute}
          artistHandle={handle ?? ''}
        />
      ))
    }
    return tracks?.map((track, i) => (
      <Draggable
        key={`${track.title}+${i}`}
        text={track.title}
        kind='track'
        id={track.track_id}
        link={fullTrackPage(track.permalink)}
      >
        <TrackListItem
          index={i}
          key={`${track.title}+${i}`}
          isLoading={isLoading}
          isAlbum={isAlbum}
          active={playingUid === track.uid}
          size={size}
          disableActions={disableActions}
          playing={isPlaying}
          track={track}
          togglePlay={togglePlay}
          goToRoute={goToRoute}
          artistHandle={handle ?? ''}
          isLastTrack={i === tracks.length - 1}
        />
      </Draggable>
    ))
  }, [
    tracks,
    isLoading,
    isAlbum,
    playingUid,
    size,
    disableActions,
    isPlaying,
    togglePlay,
    goToRoute,
    handle,
    numLoadingSkeletonRows,
    noShimmer
  ])

  const onClickTitle = useCallback(
    (e: MouseEvent) => {
      e.stopPropagation()
      goToRoute(href, { forceFetch: true })
    },
    [goToRoute, href]
  )

  const renderMoreTracks = useCallback(() => {
    const hasMoreTracks = trackCount
      ? trackCount > (tracks?.length || 0)
      : false
    return (
      !isLoading &&
      hasMoreTracks && (
        <Flex
          gap='s'
          alignItems='center'
          justifyContent='space-between'
          pv='s'
          ph='m'
          onClick={onClickTitle}
          css={{ cursor: 'pointer' }}
        >
          <Text
            size='xs'
            color='subdued'
          >{`${trackCount - (tracks?.length || 0)} More Tracks`}</Text>
          <IconArrow color='subdued' />
        </Flex>
      )
    )
  }, [trackCount, tracks, onClickTitle, isLoading])

  const order = ordered && index !== undefined ? index + 1 : undefined

  const duration =
    tracks?.reduce(
      (duration: number, track: Track) => duration + track.duration,
      0
    ) ?? 0

  useEffect(() => {
    if (!isLoading && hasLoaded) {
      hasLoaded(index)
    }
  }, [hasLoaded, index, isLoading])

  // Failsafe check - should never get this far, lineups should filter deactivated playlists
  if (isOwnerDeactivated) {
    return null
  }

  const hasOrdering = order !== undefined

  return (
    <Paper
      direction='column'
      className={containerClassName}
      css={[
        isLoading && { opacity: 0.6 },
        disableActions && { opacity: 0.5, pointerEvents: 'none' },
        { minHeight: size === TrackTileSize.LARGE ? 180 : 120 },
        { '&:hover .artworkIcon': { opacity: 0.75 } }
      ]}
      mb='l'
      onClick={!isLoading && !disableActions ? onTogglePlay : undefined}
    >
      <Flex p='s' gap='l'>
        <Flex gap='s'>
          {hasOrdering && (
            <Flex column gap='2xs' alignItems='center' justifyContent='center'>
              {!isLoading && order <= 5 && (
                <IconCrown color='default' size='s' />
              )}
              <Text variant='label' color='default'>
                {!isLoading && order}
              </Text>
            </Flex>
          )}
          {/* Collection tile image */}
          <Box h={128} w={128} css={{ minWidth: 128 }}>
            <CollectionArtwork
              id={id}
              size='large'
              isBuffering={isBuffering && isActive}
              isPlaying={isCollectionPlaying}
              artworkIconClassName='artworkIcon'
              showArtworkIcon={!isLoading}
              showSkeleton={isLoading}
              noShimmer={noShimmer}
            />
          </Box>
        </Flex>
        <Flex
          direction='column'
          justifyContent='space-between'
          flex={1}
          css={{ minWidth: 0 }}
        >
          <Flex gap='s' alignItems='flex-start'>
            <Flex direction='column' gap='s' flex={1} css={{ minWidth: 0 }}>
              {/* Header */}
              <Text variant='label' size='s' color='subdued'>
                {isAlbum ? 'album' : 'playlist'}
              </Text>
              <Flex column gap='xs'>
                {/* Title */}
                {isLoading ? (
                  <Skeleton width='80%' height='20px' noShimmer={noShimmer} />
                ) : (
                  <TextLink
                    to={permalink}
                    isActive={isActive}
                    textVariant='title'
                    applyHoverStylesToInnerSvg
                    onClick={onClickTitle}
                    disabled={disableActions}
                    ellipses
                  >
                    <Text ellipses>{title}</Text>
                    {isCollectionPlaying ? <IconVolume size='m' /> : null}
                  </TextLink>
                )}
                {/* User */}
                {isLoading ? (
                  <Skeleton width='50%' height='20px' noShimmer={noShimmer} />
                ) : (
                  <UserLink
                    ellipses
                    userId={user_id}
                    badgeSize='xs'
                    isActive={isActive}
                    popover
                    css={{ marginTop: '-4px' }}
                  />
                )}
              </Flex>
            </Flex>
            <Text
              variant='body'
              size='xs'
              color='subdued'
              css={{ flexShrink: 0, minWidth: 'fit-content' }}
            >
              {formatLineupTileDuration(duration, false, true)}
            </Text>
          </Flex>
          {/* Stats */}
          <CollectionTileStats
            collectionId={id}
            isLoading={isLoading}
            size={size}
          />
        </Flex>
      </Flex>
      {/* Track list and bottom bar remain unchanged */}
      <Flex
        backgroundColor='surface1'
        borderTop='strong'
        borderBottom='strong'
        direction='column'
        flex={1}
        css={{ minHeight: 0 }}
      >
        <Scrollbar css={{ maxHeight: 240, overflowY: 'auto' }}>
          {renderTrackList()}
        </Scrollbar>
        {renderMoreTracks()}
      </Flex>
      <Box
        css={{ flexShrink: 0 }}
        pv='s'
        ph='m'
        backgroundColor='white'
        borderLeft='default'
        borderRight='default'
        borderBottom='default'
        borderBottomLeftRadius='m'
        borderBottomRightRadius='m'
      >
        {isLoading ? (
          <Box h={40} />
        ) : isOwner ? (
          <OwnerActionButtons
            contentId={id}
            contentType='collection'
            isDisabled={disableActions}
            isLoading={isLoading}
            rightActions={renderOverflowMenu()}
            isDarkMode={isDarkMode}
            isMatrixMode={isMatrixMode}
            showIconButtons={true}
            onClickShare={onClickShare}
          />
        ) : (
          <ViewerActionButtons
            contentId={id}
            contentType='collection'
            hasStreamAccess={hasStreamAccess}
            isDisabled={disableActions}
            isLoading={isLoading}
            rightActions={renderOverflowMenu()}
            isDarkMode={isDarkMode}
            isMatrixMode={isMatrixMode}
            showIconButtons={true}
            onClickFavorite={onClickFavorite}
            onClickRepost={onClickRepost}
            onClickShare={onClickShare}
            onClickGatedUnlockPill={onClickGatedUnlockPill}
          />
        )}
      </Box>
    </Paper>
  )
}
