import { useCallback, useEffect, MouseEvent } from 'react'

import { useCurrentUserId, useTrack, useUser } from '@audius/common/api'
import { useGatedContentAccess } from '@audius/common/hooks'
import {
  ShareSource,
  RepostSource,
  FavoriteSource,
  ID
} from '@audius/common/models'
import {
  tracksSocialActions,
  shareModalUIActions,
  gatedContentActions,
  playbackSelectors,
  CommonState
} from '@audius/common/store'
import { Genre } from '@audius/common/utils'
import {
  IconCrown,
  Text,
  Flex,
  Divider,
  IconKebabHorizontal,
  Paper,
  Box,
  IconButton,
  IconVolumeLevel2 as IconVolume,
  IconPin,
  IconText
} from '@audius/harmony'
import { useSelector, useDispatch } from 'react-redux'

import { useModalState } from 'common/hooks/useModalState'
import { Draggable } from 'components/dragndrop'
import { TextLink, TrackArtists } from 'components/link'
import Menu from 'components/menu/Menu'
import Skeleton from 'components/skeleton/Skeleton'
import { TrackArtwork } from 'components/track/Artwork'
import { DragDropKind } from 'store/dragndrop/slice'
import { fullTrackPage } from 'utils/route'
import { useIsDarkMode, useIsMatrix } from 'utils/theme/theme'

import { OwnerActionButtons } from '../OwnerActionButtons'
import { TrackDogEar } from '../TrackDogEar'
import { TrackTileStats } from '../TrackTileStats'
import { ViewerActionButtons } from '../ViewerActionButtons'
import { getTrackWithFallback, getUserWithFallback } from '../helpers'
import { messages } from '../trackTileMessages'
import { TrackTileSize } from '../types'

import styles from './TrackTile.module.css'
import { TrackTileDuration } from './TrackTileDuration'

const { requestOpen: requestOpenShareModal } = shareModalUIActions
const { repostTrack, undoRepostTrack, saveTrack, unsaveTrack } =
  tracksSocialActions
const { setLockedContentId } = gatedContentActions
const {
  getTrackId: getPlayingTrackId,
  getBuffering,
  getPlaying
} = playbackSelectors

// Props from ConnectedTrackTile
export type TrackTileProps = {
  id: ID
  index: number
  order?: number
  containerClassName?: string
  size: TrackTileSize
  statSize: 'small' | 'large'
  ordered: boolean
  togglePlay: (id: ID) => void
  isLoading: boolean
  hasLoaded: (index: number) => void
  isTrending: boolean
  isFeed: boolean
  onClick?: (trackId: ID) => void
  dragKind?: DragDropKind
  noShimmer?: boolean
  showArtistPick?: boolean
}

export const TrackTile = ({
  id,
  index,
  order,
  containerClassName,
  size,
  statSize,
  ordered,
  togglePlay,
  isLoading,
  hasLoaded,
  isTrending,
  isFeed = false,
  onClick,
  dragKind,
  noShimmer,
  showArtistPick = false
}: TrackTileProps) => {
  const dispatch = useDispatch()
  const isDarkMode = useIsDarkMode()
  const isMatrixMode = useIsMatrix()
  const { data: currentUserId } = useCurrentUserId()
  const { data: track, isPending } = useTrack(id)
  const { data: partialUser } = useUser(track?.owner_id, {
    select: (user) => ({
      user_id: user?.user_id,
      handle: user?.handle,
      name: user?.name,
      is_verified: user?.is_verified,
      is_deactivated: user?.is_deactivated,
      artist_pick_track_id: user?.artist_pick_track_id
    })
  })
  const { user_id, is_deactivated: isOwnerDeactivated } =
    getUserWithFallback(partialUser)
  const isActive = useSelector(
    (state: CommonState) => getPlayingTrackId(state) === id
  )
  const isTrackPlaying = useSelector(
    (state: CommonState) => getPlayingTrackId(state) === id && getPlaying(state)
  )
  const isTrackBuffering = useSelector(
    (state: CommonState) =>
      getPlayingTrackId(state) === id && getBuffering(state)
  )
  const isOwner = currentUserId === user_id

  const trackWithFallback = getTrackWithFallback(track)
  const {
    is_delete,
    is_stream_gated: isStreamGated,
    track_id: trackId,
    title,
    genre,
    permalink,
    _co_sign: coSign,
    has_current_user_reposted: isReposted,
    has_current_user_saved: isFavorited
  } = trackWithFallback

  const isArtistPick = partialUser?.artist_pick_track_id === trackId

  const { isFetchingNFTAccess, hasStreamAccess, isPreviewable } =
    useGatedContentAccess(trackWithFallback)
  const loading = isLoading || isFetchingNFTAccess || isPending

  const [, setLockedContentVisibility] = useModalState('LockedContent')

  useEffect(() => {
    if (!loading && hasLoaded) {
      hasLoaded?.(index)
    }
  }, [hasLoaded, index, loading])

  const shareTrack = useCallback(
    (trackId: ID) => {
      dispatch(
        requestOpenShareModal({
          type: 'track',
          trackId,
          source: ShareSource.TILE
        })
      )
    },
    [dispatch]
  )
  const handleSaveTrack = useCallback(
    (trackId: ID, isFeed: boolean) => {
      dispatch(saveTrack(trackId, FavoriteSource.TILE, isFeed))
    },
    [dispatch]
  )

  const handleUndoSaveTrack = useCallback(
    (trackId: ID) => {
      dispatch(unsaveTrack(trackId, FavoriteSource.TILE))
    },
    [dispatch]
  )

  const handleRepostTrack = useCallback(
    (trackId: ID, isFeed: boolean) => {
      dispatch(repostTrack(trackId, RepostSource.TILE, isFeed))
    },
    [dispatch]
  )

  const handleUndoRepostTrack = useCallback(
    (trackId: ID) => {
      dispatch(undoRepostTrack(trackId, RepostSource.TILE))
    },
    [dispatch]
  )

  const onClickFavorite = useCallback(() => {
    if (isFavorited) {
      handleUndoSaveTrack(trackId)
    } else {
      handleSaveTrack(trackId, isFeed)
    }
  }, [isFavorited, handleUndoSaveTrack, trackId, handleSaveTrack, isFeed])

  const onClickRepost = useCallback(() => {
    if (isReposted) {
      handleUndoRepostTrack(trackId)
    } else {
      handleRepostTrack(trackId, isFeed)
    }
  }, [handleRepostTrack, handleUndoRepostTrack, trackId, isReposted, isFeed])

  const onClickShare = useCallback(
    (e?: MouseEvent) => {
      e?.stopPropagation()
      shareTrack(trackId)
    },
    [shareTrack, trackId]
  )

  const onClickTitle = useCallback(
    (e: MouseEvent) => {
      e.stopPropagation()
      onClick?.(trackId)
    },
    [onClick, trackId]
  )

  const openLockedContentModal = useCallback(() => {
    dispatch(setLockedContentId({ id: trackId }))
    setLockedContentVisibility(true)
  }, [dispatch, trackId, setLockedContentVisibility])

  const onTogglePlay = useCallback(() => {
    if (trackId && !hasStreamAccess && !isPreviewable) {
      openLockedContentModal()
      return
    }
    togglePlay(trackId)
  }, [
    togglePlay,
    isPreviewable,
    trackId,
    hasStreamAccess,
    openLockedContentModal
  ])

  const onClickArtwork = useCallback(
    (e: MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation()
      onTogglePlay()
    },
    [onTogglePlay]
  )

  const renderOverflowMenu = () => {
    const menu: Omit<import('components/menu/TrackMenu').OwnProps, 'children'> =
      {
        extraMenuItems: [],
        handle: partialUser?.handle || '',
        includeAddToPlaylist: !trackWithFallback.is_unlisted || isOwner,
        includeAddToAlbum: isOwner && !trackWithFallback.ddex_app,
        includeArtistPick: isOwner,
        includeEdit: isOwner,
        ddexApp: track?.ddex_app,
        includeEmbed: !(trackWithFallback.is_unlisted || isStreamGated),
        includeFavorite: hasStreamAccess,
        includeRepost: hasStreamAccess,
        includeShare: true,
        includeTrackPage: true,
        isDeleted: is_delete || isOwnerDeactivated,
        isFavorited,
        isOwner,
        isReposted,
        isUnlisted: trackWithFallback.is_unlisted,
        trackId,
        trackTitle: title,
        genre: genre as Genre,
        trackPermalink: permalink,
        type: 'track'
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

  if (is_delete || isOwnerDeactivated) return null

  const tileOrder =
    order ?? (ordered && index !== undefined ? index + 1 : undefined)
  const disableActions = false
  const showSkeleton = loading
  const canClickTile = !loading && !disableActions
  const artworkActionLabel =
    trackId && !hasStreamAccess && !isPreviewable
      ? `Unlock ${title || 'track'}`
      : `${isTrackPlaying ? 'Pause' : 'Play'} ${title || 'track'}`

  const tileBody = (
    <Paper
      css={[
        isLoading && { opacity: 0.6 },
        disableActions && { opacity: 0.5, pointerEvents: 'none' },
        {
          cursor: canClickTile ? 'pointer' : 'default',
          height: size === TrackTileSize.LARGE ? 144 : 128,
          containerType: 'inline-size',
          '&:hover .artworkIcon': { opacity: 0.75 },
          '&:hover': { transform: 'scale(1.004)' },
          '&:active': { transform: 'scale(1.004)' }
        }
      ]}
      className={containerClassName}
      border='default'
      mb={size === TrackTileSize.LARGE ? 'l' : 's'}
      p='s'
      gap='l'
    >
      <Flex gap='s'>
        {/* prefix ordering */}
        {tileOrder && (
          <Flex column gap='2xs' alignItems='center' justifyContent='center'>
            {tileOrder <= 10 && <IconCrown color='default' size='s' />}
            <Text variant='label' color='default'>
              {tileOrder}
            </Text>
          </Flex>
        )}
        {/* Track tile image */}
        <Box
          h={size === TrackTileSize.LARGE ? 128 : 108}
          w={size === TrackTileSize.LARGE ? 128 : 108}
        >
          <button
            type='button'
            aria-label={artworkActionLabel}
            disabled={isLoading || disableActions}
            onClick={onClickArtwork}
            css={{
              display: 'block',
              width: '100%',
              height: '100%',
              padding: 0,
              border: 0,
              background: 'transparent',
              cursor: isLoading || disableActions ? 'default' : 'pointer',
              '&:focus': {
                outline: 'none'
              },
              '&:focus-visible': {
                borderRadius: 6,
                outline:
                  '2px solid var(--harmony-focus, var(--harmony-secondary))',
                outlineOffset: 3
              }
            }}
          >
            <TrackArtwork
              id={trackId}
              coSign={coSign || undefined}
              size='large'
              isBuffering={isTrackBuffering}
              isPlaying={isTrackPlaying}
              artworkIconClassName='artworkIcon'
              showArtworkIcon={!loading}
              showSkeleton={loading}
              noShimmer={noShimmer}
              hasStreamAccess={hasStreamAccess || isPreviewable}
            />
          </button>
        </Box>
      </Flex>
      <TrackDogEar trackId={trackId} hideUnlocked />
      <Flex column flex={1} css={{ minWidth: 0 }}>
        <Flex direction='column' justifyContent='space-between' h='100%'>
          <Flex column gap='s' w='100%'>
            <Flex direction='column' gap='xs' pv='xs'>
              <Flex gap='s' alignItems='flex-start'>
                <Flex
                  css={{ minWidth: 0, flex: 1 }}
                  direction='column'
                  gap='xs'
                >
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
                      className={styles.trackTitleLink}
                      aria-label={`View track: ${title}`}
                      ellipses
                    >
                      <Text ellipses>{title}</Text>
                      {isTrackPlaying ? <IconVolume size='m' /> : null}
                    </TextLink>
                  )}
                  {isLoading ? (
                    <Skeleton width='50%' height='20px' noShimmer={noShimmer} />
                  ) : (
                    <TrackArtists
                      userId={user_id}
                      collaborators={track?.collaborators}
                      badgeSize='xs'
                      isActive={isActive}
                      aria-label={partialUser?.name}
                      popover
                      css={{ marginTop: '-4px' }}
                    />
                  )}
                </Flex>
                <Flex gap='s' alignItems='center'>
                  {showArtistPick && isArtistPick ? (
                    <IconText icons={[{ icon: IconPin }]}>
                      {messages.artistPick}
                    </IconText>
                  ) : null}
                  <TrackTileDuration trackId={trackId} isLoading={isLoading} />
                </Flex>
              </Flex>
            </Flex>
          </Flex>
          <TrackTileStats
            trackId={trackId}
            size={size}
            isLoading={isLoading}
            noShimmer={noShimmer}
          />
        </Flex>
        {isOwner ? (
          <Flex column gap='s'>
            <Divider orientation='horizontal' color='default' />
            <OwnerActionButtons
              contentId={trackId}
              contentType='track'
              isDisabled={disableActions}
              isLoading={isLoading}
              rightActions={renderOverflowMenu()}
              isDarkMode={isDarkMode}
              isMatrixMode={isMatrixMode}
              showIconButtons={true}
              onClickShare={onClickShare}
            />
          </Flex>
        ) : (
          <Flex column gap='s'>
            <Divider orientation='horizontal' color='default' />
            <ViewerActionButtons
              contentId={trackId}
              contentType='track'
              hasStreamAccess={hasStreamAccess}
              isDisabled={disableActions}
              isLoading={isLoading}
              rightActions={renderOverflowMenu()}
              isDarkMode={isDarkMode}
              isMatrixMode={isMatrixMode}
              showIconButtons={true}
              onClickRepost={onClickRepost}
              onClickFavorite={onClickFavorite}
              onClickShare={onClickShare}
              onClickGatedUnlockPill={openLockedContentModal}
            />
          </Flex>
        )}
      </Flex>
    </Paper>
  )

  const tileContent = (
    <div
      data-testid='track-tile-click-target'
      onClick={canClickTile ? onTogglePlay : undefined}
    >
      {tileBody}
    </div>
  )

  if (isStreamGated) {
    return tileContent
  }

  return (
    <Draggable
      text={title}
      kind={dragKind ?? 'track'}
      id={trackId}
      isOwner={isOwner}
      isDisabled={disableActions || showSkeleton}
      link={fullTrackPage(permalink)}
    >
      {tileContent}
    </Draggable>
  )
}
