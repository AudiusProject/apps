import { MouseEvent, useCallback, useEffect } from 'react'

import { useCurrentUserId, useTrack, useUser } from '@audius/common/api'
import { useGatedContentAccess } from '@audius/common/hooks'
import { FavoriteSource, ID, SquareSizes } from '@audius/common/models'
import {
  CommonState,
  gatedContentActions,
  gatedContentSelectors,
  playbackPositionSelectors,
  playbackSelectors,
  tracksSocialActions
} from '@audius/common/store'
import {
  formatCount,
  formatLineupTileDuration,
  Genre,
  isLongFormContent
} from '@audius/common/utils'
import {
  Artwork,
  IconButton,
  IconKebabHorizontal,
  IconPin,
  Text,
  TrackRow
} from '@audius/harmony'
import { useDispatch, useSelector } from 'react-redux'

import { useModalState } from 'common/hooks/useModalState'
import { Draggable } from 'components/dragndrop'
import { TextLink, TrackArtists } from 'components/link'
import Menu from 'components/menu/Menu'
import { OwnProps as TrackMenuProps } from 'components/menu/TrackMenu'
import { useTrackCoverArt } from 'hooks/useTrackCoverArt'
import { fullTrackPage } from 'utils/route'

import { GatedConditionsPill } from '../GatedConditionsPill'
import { TrackAccessTypeLabel } from '../TrackAccessTypeLabel'
import { getTrackWithFallback, getUserWithFallback } from '../helpers'
import { messages } from '../trackTileMessages'

const { saveTrack, unsaveTrack } = tracksSocialActions
const { setLockedContentId } = gatedContentActions
const { getGatedContentStatusMap } = gatedContentSelectors
const { getTrackPosition } = playbackPositionSelectors
const {
  getTrackId: getPlayingTrackId,
  getPlaying,
  getBuffering
} = playbackSelectors

export type TrackRowTileProps = {
  id: ID
  index: number
  order?: number
  ordered: boolean
  togglePlay: (id: ID) => void
  isLoading: boolean
  hasLoaded?: (index: number) => void
  isTrending?: boolean
  isFeed?: boolean
  onClick?: (trackId: ID) => void
  containerClassName?: string
  showArtistPick?: boolean
}

export const TrackRowTile = ({
  id,
  index,
  order,
  ordered,
  togglePlay,
  isLoading,
  hasLoaded,
  isFeed = false,
  onClick,
  containerClassName,
  showArtistPick = false
}: TrackRowTileProps) => {
  const dispatch = useDispatch()
  const { data: currentUserId } = useCurrentUserId()
  const { data: track, isPending } = useTrack(id)
  const { data: partialUser } = useUser(track?.owner_id, {
    select: (user) => ({
      user_id: user?.user_id,
      handle: user?.handle,
      name: user?.name,
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

  const trackWithFallback = getTrackWithFallback(track)
  const {
    is_delete,
    is_stream_gated: isStreamGated,
    is_unlisted: isUnlisted,
    track_id: trackId,
    title,
    genre,
    permalink,
    duration,
    play_count: playCount,
    stream_conditions: streamConditions,
    has_current_user_reposted: isReposted,
    has_current_user_saved: isFavorited
  } = trackWithFallback

  const isOwner = currentUserId === user_id
  const gatedStatus = useSelector(
    (state: CommonState) => getGatedContentStatusMap(state)[trackId]
  )
  const trackPosition = useSelector((state: CommonState) =>
    getTrackPosition(state, { trackId, userId: currentUserId })
  )
  const isArtistPick =
    showArtistPick && partialUser?.artist_pick_track_id === trackId

  const { isFetchingNFTAccess, hasStreamAccess, isPreviewable } =
    useGatedContentAccess(trackWithFallback)
  const loading = isLoading || isFetchingNFTAccess || isPending

  const { imageUrl } = useTrackCoverArt({
    trackId: loading ? undefined : trackId,
    size: SquareSizes.SIZE_150_BY_150
  })

  const [, setLockedContentVisibility] = useModalState('LockedContent')

  useEffect(() => {
    if (!loading && hasLoaded) hasLoaded(index)
  }, [hasLoaded, index, loading])

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
    trackId,
    hasStreamAccess,
    isPreviewable,
    openLockedContentModal,
    togglePlay
  ])

  const onToggleFavorite = useCallback(() => {
    if (isFavorited) {
      dispatch(unsaveTrack(trackId, FavoriteSource.TILE))
    } else {
      dispatch(saveTrack(trackId, FavoriteSource.TILE, isFeed))
    }
  }, [dispatch, isFavorited, trackId, isFeed])

  const onClickTitle = useCallback(
    (e: MouseEvent) => {
      e.stopPropagation()
      onClick?.(trackId)
    },
    [onClick, trackId]
  )

  if (loading) {
    return <TrackRow title='' isLoading className={containerClassName} />
  }

  if (is_delete || isOwnerDeactivated) return null

  const rank = order ?? (ordered && index !== undefined ? index + 1 : undefined)

  const menu: Omit<TrackMenuProps, 'children'> = {
    extraMenuItems: [],
    handle: partialUser?.handle || '',
    includeAddToPlaylist: !isUnlisted || isOwner,
    includeAddToAlbum: isOwner && !trackWithFallback.ddex_app,
    includeArtistPick: isOwner,
    includeEdit: isOwner,
    ddexApp: track?.ddex_app,
    includeEmbed: !(isUnlisted || isStreamGated),
    includeFavorite: hasStreamAccess,
    includeRepost: hasStreamAccess,
    includeShare: true,
    includeTrackPage: true,
    isDeleted: is_delete || isOwnerDeactivated,
    isFavorited,
    isOwner,
    isReposted,
    isUnlisted,
    trackId,
    trackTitle: title,
    genre: genre as Genre,
    trackPermalink: permalink,
    type: 'track'
  }

  const overflowMenu = (
    <Menu menu={menu}>
      {(ref, triggerPopup) => (
        <IconButton
          size='s'
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

  const isLocked = !!streamConditions && !hasStreamAccess && !isOwner
  const status = isLocked ? (
    <GatedConditionsPill
      streamConditions={streamConditions}
      unlocking={gatedStatus === 'UNLOCKING'}
      onClick={openLockedContentModal}
      buttonSize='small'
      showIcon={false}
      contentId={trackId}
      contentType='track'
    />
  ) : streamConditions || isUnlisted ? (
    <TrackAccessTypeLabel trackId={trackId} />
  ) : undefined

  const isLongForm = isLongFormContent({ genre })
  const durationLabel = !duration
    ? undefined
    : isLongForm && trackPosition?.status === 'IN_PROGRESS'
      ? `${formatLineupTileDuration(
          duration - trackPosition.playbackPosition,
          true,
          true
        )} ${messages.timeLeft}`
      : isLongForm && trackPosition?.status === 'COMPLETED'
        ? messages.played
        : formatLineupTileDuration(duration, isLongForm, false)

  const playLabel =
    trackId && !hasStreamAccess && !isPreviewable
      ? `Unlock ${title || 'track'}`
      : `${isTrackPlaying ? 'Pause' : 'Play'} ${title || 'track'}`

  const row = (
    <TrackRow
      className={containerClassName}
      rank={rank}
      artwork={
        <Artwork
          src={imageUrl}
          w={40}
          h={40}
          borderRadius='s'
          isLoading={isTrackBuffering ? true : undefined}
        />
      }
      title={
        <TextLink
          to={permalink}
          isActive={isActive}
          textVariant='body'
          onClick={onClickTitle}
          aria-label={`View track: ${title}`}
          ellipses
        >
          <Text ellipses>{title}</Text>
        </TextLink>
      }
      subtitle={
        <TrackArtists
          userId={user_id}
          collaborators={track?.collaborators}
          badgeSize='xs'
          isActive={isActive}
          aria-label={partialUser?.name}
          popover
        />
      }
      playCount={
        isUnlisted || isLocked || !playCount
          ? undefined
          : formatCount(playCount)
      }
      status={status}
      duration={durationLabel}
      isActive={isActive}
      isPlaying={isTrackPlaying}
      isFavorited={!!isFavorited}
      onTogglePlay={onTogglePlay}
      onToggleFavorite={
        hasStreamAccess && !isOwner ? onToggleFavorite : undefined
      }
      menu={overflowMenu}
      playLabel={playLabel}
      context={
        isArtistPick ? (
          <>
            <IconPin size='xs' color='subdued' />
            {messages.artistPick}
          </>
        ) : undefined
      }
      data-testid='track-row'
    />
  )

  if (isStreamGated) return row

  return (
    <Draggable
      text={title}
      kind='track'
      id={trackId}
      isOwner={isOwner}
      link={fullTrackPage(permalink)}
    >
      {row}
    </Draggable>
  )
}
