import { useCallback } from 'react'

import {
  useCurrentUserId,
  useToggleFavoriteTrack,
  useTrack,
  useUser
} from '@audius/common/api'
import { useGatedTrackAccess } from '@audius/common/hooks'
import {
  ShareSource,
  RepostSource,
  FavoriteSource,
  PlaybackSource,
  SquareSizes,
  isContentUSDCPurchaseGated,
  ModalSource
} from '@audius/common/models'
import {
  tracksSocialActions,
  mobileOverflowMenuUIActions,
  shareModalUIActions,
  OverflowAction,
  OverflowSource,
  playerSelectors,
  playbackPositionSelectors,
  trackPageActions,
  PurchaseableContentType,
  gatedContentActions,
  usePremiumContentPurchaseModal,
  usePublishConfirmationModal
} from '@audius/common/store'
import type { CommonState } from '@audius/common/store'
import { Genre, removeNullable } from '@audius/common/utils'
import { useNavigationState } from '@react-navigation/native'
import { useDispatch, useSelector } from 'react-redux'

import { Paper, type ImageProps } from '@audius/harmony-native'
import type { TrackTileProps } from 'app/components/lineup-tile/types'
import { useIsUSDCEnabled } from 'app/hooks/useIsUSDCEnabled'
import { useNavigation } from 'app/hooks/useNavigation'
import { setVisibility } from 'app/store/drawers/slice'

import { TrackImage } from '../image/TrackImage'
import { TrackDogEar } from '../track/TrackDogEar'

import { LineupTileActionButtons } from './LineupTileActionButtons'
import { LineupTileMetadata } from './LineupTileMetadata'
import { TrackTileStats } from './TrackTileStats'

const { getUid } = playerSelectors
const { requestOpen: requestOpenShareModal } = shareModalUIActions
const { open: openOverflowMenu } = mobileOverflowMenuUIActions
const { repostTrack, undoRepostTrack } = tracksSocialActions
const { getTrackPosition } = playbackPositionSelectors
const { setLockedContentId } = gatedContentActions

export const TrackTile = (props: TrackTileProps) => {
  const { id, onPress, togglePlay, variant, style, ...lineupTileProps } = props

  const dispatch = useDispatch()
  const navigation = useNavigation()
  const isOnArtistsTracksTab = useNavigationState((state) => {
    // @ts-expect-error -- history returning unknown[]
    const currentScreen = state.history?.[0].key
    return currentScreen?.includes('Tracks')
  })
  const { data: currentUserId } = useCurrentUserId()
  const { onOpen: openPublishModal } = usePublishConfirmationModal()
  const { onOpen: openPremiumContentPurchaseModal } =
    usePremiumContentPurchaseModal()
  const isUSDCEnabled = useIsUSDCEnabled()

  const { data: track } = useTrack(id, {
    select: (track) => ({
      duration: track.duration,
      field_visibility: track.field_visibility,
      has_current_user_reposted: track.has_current_user_reposted,
      has_current_user_saved: track.has_current_user_saved,
      title: track.title,
      track_id: track.track_id,
      genre: track.genre,
      stream_conditions: track.stream_conditions,

      ddex_app: track.ddex_app,
      is_unlisted: track.is_unlisted,
      album_backlink: track.album_backlink,
      owner_id: track.owner_id,
      is_delete: track.is_delete,
      is_scheduled_release: track.is_scheduled_release,
      preview_cid: track.preview_cid
    })
  })

  const { data: user } = useUser(track?.owner_id, {
    select: (user) => ({
      artist_pick_track_id: user.artist_pick_track_id,
      user_id: user.user_id,
      is_deactivated: user.is_deactivated
    })
  })

  const { hasStreamAccess } = useGatedTrackAccess(id)

  const openLockedContentModal = useCallback(() => {
    if (track?.track_id) {
      dispatch(setLockedContentId({ id: track.track_id }))
      dispatch(setVisibility({ drawer: 'LockedContent', visible: true }))
    }
  }, [track?.track_id, dispatch])

  const isPlayingUid = useSelector(
    (state: CommonState) => getUid(state) === lineupTileProps.uid
  )

  const renderImage = useCallback(
    (props: ImageProps) => (
      <TrackImage
        trackId={track?.track_id ?? 0}
        size={SquareSizes.SIZE_150_BY_150}
        {...props}
      />
    ),
    [track?.track_id]
  )

  const handlePress = useCallback(() => {
    if (!track) return

    const isUSDCPurchase =
      isUSDCEnabled && isContentUSDCPurchaseGated(track.stream_conditions)
    const isStreamGated = !!track.stream_conditions

    // Check if track is gated and user doesn't have access
    if (isStreamGated && !hasStreamAccess && !track.preview_cid) {
      if (isUSDCPurchase) {
        openPremiumContentPurchaseModal(
          {
            contentId: track.track_id,
            contentType: PurchaseableContentType.TRACK
          },
          { source: ModalSource.LineUpTrackTile }
        )
      } else {
        openLockedContentModal()
      }
      return
    }

    setTimeout(() => {
      togglePlay({
        uid: lineupTileProps.uid,
        id: track.track_id,
        source: PlaybackSource.TRACK_TILE
      })
      onPress?.(track.track_id)
    }, 100)
  }, [
    track,
    hasStreamAccess,
    isUSDCEnabled,
    openPremiumContentPurchaseModal,
    openLockedContentModal,
    togglePlay,
    lineupTileProps.uid,
    onPress
  ])

  const handlePressTitle = useCallback(() => {
    if (!track) return
    navigation.push('Track', { trackId: track.track_id })
    onPress?.(track.track_id)
  }, [navigation, onPress, track])

  const playbackPositionInfo = useSelector((state) =>
    getTrackPosition(state, {
      trackId: track?.track_id ?? 0,
      userId: currentUserId
    })
  )

  const handlePressOverflow = useCallback(() => {
    if (!track) return
    const isLongFormContent =
      track.genre === Genre.PODCASTS || track.genre === Genre.AUDIOBOOKS
    const isOwner = currentUserId === track.owner_id
    const isArtistPick =
      isOwner && user?.artist_pick_track_id === track.track_id

    const overflowActions = [
      isOwner && !track.ddex_app ? OverflowAction.ADD_TO_ALBUM : null,
      !track.is_unlisted || isOwner ? OverflowAction.ADD_TO_PLAYLIST : null,
      isLongFormContent
        ? OverflowAction.VIEW_EPISODE_PAGE
        : OverflowAction.VIEW_TRACK_PAGE,
      track.album_backlink ? OverflowAction.VIEW_ALBUM_PAGE : null,
      isLongFormContent
        ? playbackPositionInfo?.status === 'COMPLETED'
          ? OverflowAction.MARK_AS_UNPLAYED
          : OverflowAction.MARK_AS_PLAYED
        : null,
      isOwner && !isArtistPick ? OverflowAction.SET_ARTIST_PICK : null,
      isArtistPick ? OverflowAction.UNSET_ARTIST_PICK : null,
      isOnArtistsTracksTab ? null : OverflowAction.VIEW_ARTIST_PAGE,
      isOwner && !track.ddex_app ? OverflowAction.EDIT_TRACK : null,
      isOwner && track?.is_scheduled_release && track?.is_unlisted
        ? OverflowAction.RELEASE_NOW
        : null,
      isOwner && !track.ddex_app ? OverflowAction.DELETE_TRACK : null
    ].filter(removeNullable)

    dispatch(
      openOverflowMenu({
        source: OverflowSource.TRACKS,
        id: track.track_id,
        overflowActions
      })
    )
  }, [
    track,
    currentUserId,
    user?.artist_pick_track_id,
    isOnArtistsTracksTab,
    playbackPositionInfo?.status,
    dispatch
  ])

  const handlePressShare = useCallback(() => {
    if (!track) return
    dispatch(
      requestOpenShareModal({
        type: 'track',
        trackId: track.track_id,
        source: ShareSource.TILE
      })
    )
  }, [dispatch, track])

  const handlePressSave = useToggleFavoriteTrack({
    trackId: track?.track_id as number,
    source: FavoriteSource.TILE
  })

  const handlePressRepost = useCallback(() => {
    if (!track) return
    if (track.has_current_user_reposted) {
      dispatch(undoRepostTrack(track.track_id, RepostSource.TILE))
    } else {
      dispatch(repostTrack(track.track_id, RepostSource.TILE))
    }
  }, [track, dispatch])

  const publish = useCallback(() => {
    if (!track) return
    dispatch(trackPageActions.makeTrackPublic(track.track_id))
  }, [dispatch, track])

  const handlePressPublish = useCallback(() => {
    openPublishModal({ contentType: 'track', confirmCallback: publish })
  }, [openPublishModal, publish])

  const onPressEdit = useCallback(() => {
    if (!track) return
    navigation?.push('EditTrack', { id: track.track_id })
  }, [navigation, track])

  if (!track || !user) {
    console.warn('Track or user missing for TrackTile, preventing render')
    return null
  }

  if (track.is_delete || user?.is_deactivated) {
    return null
  }

  const isOwner = currentUserId === track.owner_id
  const hideShare = !isOwner && track.field_visibility?.share === false
  const isReadonly = variant === 'readonly'
  const isArtistPick = user?.artist_pick_track_id === track.track_id

  return (
    <Paper onPress={handlePress} style={style}>
      <TrackDogEar trackId={track.track_id} hideUnlocked />
      <LineupTileMetadata
        renderImage={renderImage}
        onPressTitle={handlePressTitle}
        title={track.title}
        userId={user.user_id}
        isPlayingUid={isPlayingUid}
        type='track'
        trackId={track.track_id}
        duration={track.duration}
        isLongFormContent={
          track.genre === Genre.PODCASTS || track.genre === Genre.AUDIOBOOKS
        }
        isArtistPick={isArtistPick}
      />
      <TrackTileStats
        trackId={track.track_id}
        rankIndex={lineupTileProps.index}
        isTrending={lineupTileProps.isTrending}
        uid={lineupTileProps.uid}
        actions={lineupTileProps.actions}
      />
      {isReadonly ? null : (
        <LineupTileActionButtons
          hasReposted={track.has_current_user_reposted}
          hasSaved={track.has_current_user_saved}
          isOwner={isOwner}
          isShareHidden={hideShare}
          isUnlisted={track.is_unlisted}
          readonly={isReadonly}
          contentId={track.track_id}
          contentType={PurchaseableContentType.TRACK}
          streamConditions={track.stream_conditions}
          hasStreamAccess={hasStreamAccess}
          source={lineupTileProps.source}
          onPressOverflow={handlePressOverflow}
          onPressRepost={handlePressRepost}
          onPressSave={handlePressSave}
          onPressShare={handlePressShare}
          onPressPublish={handlePressPublish}
          onPressEdit={onPressEdit}
        />
      )}
    </Paper>
  )
}
