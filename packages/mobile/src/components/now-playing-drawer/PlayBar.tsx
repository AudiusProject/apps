import { useCallback } from 'react'

import { useGatedContentAccess } from '@audius/common/hooks'
import { FavoriteSource, SquareSizes } from '@audius/common/models'
import type { Track, User } from '@audius/common/models'
import {
  accountSelectors,
  tracksSocialActions,
  playerSelectors
} from '@audius/common/store'
import type { Nullable } from '@audius/common/utils'
import { TouchableOpacity, Animated, View } from 'react-native'
import { useDispatch, useSelector } from 'react-redux'

import { IconLock } from '@audius/harmony-native'
import { FavoriteButton } from 'app/components/favorite-button'
import Text from 'app/components/text'
import { makeStyles } from 'app/styles'
import { useColor } from 'app/utils/theme'
import { zIndex } from 'app/utils/zIndex'

import { LockedStatusBadge } from '../core'
import { TrackImage } from '../image/TrackImage'

import { PlayButton } from './PlayButton'
import { TrackingBar } from './TrackingBar'
import { NOW_PLAYING_HEIGHT, PLAY_BAR_HEIGHT } from './constants'
const { getUserId } = accountSelectors
const { saveTrack, unsaveTrack } = tracksSocialActions
const { getPreviewing } = playerSelectors

const messages = {
  preview: 'PREVIEW'
}

const useStyles = makeStyles(({ palette, spacing }) => ({
  root: {
    width: '100%',
    height: PLAY_BAR_HEIGHT,
    alignItems: 'center',
    zIndex: zIndex.PLAY_BAR
  },
  // Group: Favorite Button, Track Content, Play Button
  container: {
    height: '100%',
    width: '100%',
    paddingLeft: spacing(3),
    paddingRight: spacing(3),
    gap: spacing(3),
    flexDirection: 'row',
    alignItems: 'center'
  },
  favoriteContainer: {
    flexShrink: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  trackContainer: {
    paddingRight: spacing(1),
    height: '100%',
    width: '100%',
    flexGrow: 1,
    flexShrink: 1,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: spacing(3)
  },
  playContainer: {
    flexShrink: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  playIcon: {
    width: spacing(8),
    height: spacing(8)
  },
  icon: {
    width: 28,
    height: 28
  },
  // Group: Artwork, Text
  artworkContainer: {
    borderRadius: 2,
    overflow: 'hidden'
  },
  trackTextContainer: {
    flexGrow: 1,
    flexShrink: 1,
    width: '100%',
    alignItems: 'center',
    flexDirection: 'row'
  },
  // Group: Title, separator, artist
  title: {
    flexShrink: 1,
    color: palette.neutral,
    fontSize: spacing(3)
  },
  separator: {
    color: palette.neutral,
    marginLeft: spacing(1),
    marginRight: spacing(1),
    fontSize: spacing(4)
  },
  artist: {
    flexGrow: 1,
    flexShrink: 1,
    color: palette.neutral,
    fontSize: spacing(3)
  },
  // Artwork interior
  artwork: {
    height: 26,
    width: 26,
    backgroundColor: palette.neutralLight7
  },
  lockOverlay: {
    backgroundColor: '#000',
    opacity: 0.4,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 10,
    zIndex: 10
  }
}))

type PlayBarProps = {
  track: Nullable<Track>
  duration: number
  user: Nullable<User>
  onPress: () => void
  translationAnim: Animated.Value
  mediaKey: string
}

export const PlayBar = (props: PlayBarProps) => {
  const { duration, track, user, onPress, translationAnim, mediaKey } = props
  const styles = useStyles()
  const dispatch = useDispatch()
  const accountUserId = useSelector(getUserId)
  const staticWhite = useColor('white')

  const { hasStreamAccess } = useGatedContentAccess(track)
  const isPreviewing = useSelector(getPreviewing)
  const shouldShowPreviewLock =
    isPreviewing ||
    (track?.stream_conditions &&
      'usdc_purchase' in track.stream_conditions &&
      !hasStreamAccess)

  const onPressFavoriteButton = useCallback(() => {
    if (track) {
      if (track.has_current_user_saved) {
        dispatch(unsaveTrack(track.track_id, FavoriteSource.PLAYBAR))
      } else {
        dispatch(saveTrack(track.track_id, FavoriteSource.PLAYBAR))
      }
    }
  }, [dispatch, track])

  const renderFavoriteButton = () => {
    return (
      <FavoriteButton
        isDisabled={accountUserId === track?.owner_id || track?.is_unlisted}
        onPress={onPressFavoriteButton}
        isActive={track?.has_current_user_saved ?? false}
        wrapperStyle={styles.icon}
      />
    )
  }

  const rootOpacityAnimation = translationAnim.interpolate({
    // Interpolate the animation such that the play bar fades out
    // at 25% up the screen.
    inputRange: [
      0,
      0.75 * (NOW_PLAYING_HEIGHT - PLAY_BAR_HEIGHT),
      NOW_PLAYING_HEIGHT - PLAY_BAR_HEIGHT
    ],
    outputRange: [0, 0, 1],
    extrapolate: 'extend'
  })

  return (
    <Animated.View style={[styles.root, { opacity: rootOpacityAnimation }]}>
      <TrackingBar
        duration={duration}
        mediaKey={mediaKey}
        translateYAnimation={translationAnim}
      />
      <View style={styles.container}>
        {shouldShowPreviewLock ? null : (
          <View style={styles.favoriteContainer}>{renderFavoriteButton()}</View>
        )}
        <TouchableOpacity
          activeOpacity={1}
          style={styles.trackContainer}
          onPress={onPress}
        >
          {track ? (
            <View style={styles.artworkContainer}>
              {shouldShowPreviewLock ? (
                <View style={styles.lockOverlay}>
                  <IconLock fill={staticWhite} width={10} height={10} />
                </View>
              ) : null}
              <TrackImage
                trackId={track?.track_id}
                style={styles.artwork}
                size={SquareSizes.SIZE_150_BY_150}
              />
            </View>
          ) : null}
          <View style={styles.trackTextContainer}>
            <Text numberOfLines={1} weight='bold' style={styles.title}>
              {track?.title ?? ''}
            </Text>
            <Text
              weight='bold'
              style={styles.separator}
              accessibilityElementsHidden
            >
              {track ? '•' : ''}
            </Text>
            <Text numberOfLines={1} weight='medium' style={styles.artist}>
              {user?.name ?? ''}
            </Text>
          </View>
          {shouldShowPreviewLock ? (
            <View>
              <LockedStatusBadge
                variant='premium'
                locked
                coloredWhenLocked
                iconSize='small'
                text={messages.preview}
              />
            </View>
          ) : null}
        </TouchableOpacity>
        <View style={styles.playContainer}>
          <PlayButton wrapperStyle={styles.playIcon} />
        </View>
      </View>
    </Animated.View>
  )
}
