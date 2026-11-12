import { memo, useCallback, useContext } from 'react'

import { useCurrentUserId, useTrack, useUser } from '@audius/common/api'
import { useGatedTrackAccess } from '@audius/common/hooks'
import {
  ModalSource,
  PlaybackSource,
  SquareSizes,
  isContentUSDCPurchaseGated
} from '@audius/common/models'
import {
  PurchaseableContentType,
  gatedContentActions,
  playbackPositionSelectors,
  playbackSelectors,
  usePremiumContentPurchaseModal
} from '@audius/common/store'
import type { CommonState } from '@audius/common/store'
import { Genre, formatLineupTileDuration } from '@audius/common/utils'
import { View } from 'react-native'
import { useDispatch, useSelector } from 'react-redux'

import {
  Flex,
  IconPin,
  IconPlay,
  IconText,
  Text,
  TrackRow
} from '@audius/harmony-native'
import { LineupContext } from 'app/components/lineup/LineupContext'
import type { TrackTileProps } from 'app/components/lineup-tile/types'
import { AnimatedEqBars } from 'app/components/track-list/AnimatedEqBars'
import { UserBadges } from 'app/components/user-badges'
import * as haptics from 'app/haptics'
import { useIsUSDCEnabled } from 'app/hooks/useIsUSDCEnabled'
import { setVisibility } from 'app/store/drawers/slice'

import { TrackImage } from '../image/TrackImage'
import { TrackDownloadStatusIndicator } from '../offline-downloads/TrackDownloadStatusIndicator'

import { LineupTileAccessStatus } from './LineupTileAccessStatus'
import { useOpenTrackOverflow } from './useOpenTrackOverflow'

const { getTrackId, getPlaying } = playbackSelectors
const { getTrackPosition } = playbackPositionSelectors
const { setLockedContentId } = gatedContentActions

const messages = {
  artistPick: 'Artist Pick',
  timeLeft: 'left',
  played: 'Played',
  play: (title: string) => `Play ${title}`,
  pause: (title: string) => `Pause ${title}`
}

const overlayStyle = {
  position: 'absolute' as const,
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  // Above Artwork's image, which sets zIndex 2
  zIndex: 3,
  alignItems: 'center' as const,
  backgroundColor: 'rgba(0,0,0,0.45)'
}

export type TrackRowTileProps = TrackTileProps & {
  /** Shows the offline download state after the title (Library). */
  showDownloadStatus?: boolean
}

const TrackRowTileComponent = (props: TrackRowTileProps) => {
  const {
    id,
    uid,
    index,
    isTrending,
    togglePlay,
    onPress,
    showArtistPick = false,
    showDownloadStatus = false,
    source
  } = props

  const dispatch = useDispatch()
  const { isOnArtistsTracksTab } = useContext(LineupContext)
  const { data: currentUserId } = useCurrentUserId()
  const { onOpen: openPremiumContentPurchaseModal } =
    usePremiumContentPurchaseModal()
  const isUSDCEnabled = useIsUSDCEnabled()
  const { hasStreamAccess } = useGatedTrackAccess(id)

  const { data: track } = useTrack(id, {
    select: (track) => ({
      track_id: track.track_id,
      title: track.title,
      owner_id: track.owner_id,
      duration: track.duration,
      genre: track.genre,
      stream_conditions: track.stream_conditions,
      preview_cid: track.preview_cid,
      is_delete: track.is_delete
    })
  })
  const { data: user } = useUser(track?.owner_id, {
    select: (user) => ({
      name: user.name,
      artist_pick_track_id: user.artist_pick_track_id,
      is_deactivated: user.is_deactivated
    })
  })

  const isActive = useSelector((state: CommonState) => getTrackId(state) === id)
  const isPlaying = useSelector(
    (state: CommonState) => getTrackId(state) === id && getPlaying(state)
  )
  const playbackPosition = useSelector((state) =>
    getTrackPosition(state, { trackId: id, userId: currentUserId })
  )

  const handlePressOverflow = useOpenTrackOverflow(id, {
    includeSocial: true,
    hideViewArtist: isOnArtistsTracksTab
  })

  const handleLongPress = useCallback(() => {
    haptics.medium()
    handlePressOverflow()
  }, [handlePressOverflow])

  const handlePress = useCallback(() => {
    if (!track) return
    const isStreamGated = !!track.stream_conditions
    if (isStreamGated && !hasStreamAccess && !track.preview_cid) {
      if (
        isUSDCEnabled &&
        isContentUSDCPurchaseGated(track.stream_conditions)
      ) {
        openPremiumContentPurchaseModal(
          {
            contentId: track.track_id,
            contentType: PurchaseableContentType.TRACK
          },
          { source: ModalSource.LineUpTrackTile }
        )
      } else {
        dispatch(setLockedContentId({ id: track.track_id }))
        dispatch(setVisibility({ drawer: 'LockedContent', visible: true }))
      }
      return
    }
    togglePlay({ uid, id: track.track_id, source: PlaybackSource.TRACK_TILE })
    onPress?.(track.track_id)
  }, [
    track,
    hasStreamAccess,
    isUSDCEnabled,
    openPremiumContentPurchaseModal,
    dispatch,
    togglePlay,
    uid,
    onPress
  ])

  const rank = isTrending && index !== undefined ? index + 1 : undefined

  if (!track || !user) return <TrackRow isLoading rank={rank} />
  if (track.is_delete || user.is_deactivated) return null

  const isOwner = currentUserId === track.owner_id
  const isLocked = !!track.stream_conditions && !hasStreamAccess && !isOwner
  const isLongForm =
    track.genre === Genre.Podcasts || track.genre === Genre.Audiobooks

  const duration = !track.duration
    ? undefined
    : isLongForm && playbackPosition?.status === 'COMPLETED'
      ? messages.played
      : isLongForm && playbackPosition?.status === 'IN_PROGRESS'
        ? `${formatLineupTileDuration(
            track.duration - playbackPosition.playbackPosition,
            true
          )} ${messages.timeLeft}`
        : formatLineupTileDuration(track.duration, isLongForm)

  const isArtistPick =
    showArtistPick && user.artist_pick_track_id === track.track_id

  return (
    <TrackRow
      rank={rank}
      artwork={
        <>
          <TrackImage
            trackId={track.track_id}
            size={SquareSizes.SIZE_150_BY_150}
            style={{ width: 48, height: 48 }}
          />
          {isActive ? (
            <View
              pointerEvents='none'
              style={[
                overlayStyle,
                { justifyContent: isPlaying ? 'flex-end' : 'center' }
              ]}
            >
              {isPlaying ? (
                <AnimatedEqBars isPlaying />
              ) : (
                <IconPlay color='white' size='m' />
              )}
            </View>
          ) : null}
        </>
      }
      title={track.title}
      titleAdornment={
        showDownloadStatus ? (
          <TrackDownloadStatusIndicator trackId={track.track_id} size='s' />
        ) : undefined
      }
      subtitle={
        <Flex row alignItems='center' gap='xs'>
          <Text
            variant='body'
            size='s'
            color='subdued'
            numberOfLines={1}
            style={{ flexShrink: 1 }}
          >
            {user.name}
          </Text>
          <UserBadges userId={track.owner_id} badgeSize='xs' />
        </Flex>
      }
      context={
        isArtistPick ? (
          <IconText icons={[{ icon: IconPin }]}>{messages.artistPick}</IconText>
        ) : undefined
      }
      status={
        isLocked && track.stream_conditions ? (
          <LineupTileAccessStatus
            contentId={track.track_id}
            contentType={PurchaseableContentType.TRACK}
            streamConditions={track.stream_conditions}
            hasStreamAccess={hasStreamAccess}
            source={source}
          />
        ) : undefined
      }
      duration={duration}
      isActive={isActive}
      onPress={handlePress}
      onLongPress={handleLongPress}
      accessibilityLabel={
        isPlaying ? messages.pause(track.title) : messages.play(track.title)
      }
    />
  )
}

export const TrackRowTile = memo(TrackRowTileComponent)
