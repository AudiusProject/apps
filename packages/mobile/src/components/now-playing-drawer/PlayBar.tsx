import { useCallback } from 'react'

import {
  useGatedContentAccess,
  useQueueNewFeatureBadge
} from '@audius/common/hooks'
import { SquareSizes } from '@audius/common/models'
import type { Track, User } from '@audius/common/models'
import { playbackSelectors } from '@audius/common/store'
import type { Nullable } from '@audius/common/utils'
import { TouchableOpacity, Animated, View } from 'react-native'
import Reanimated, {
  interpolate,
  useAnimatedStyle
} from 'react-native-reanimated'
import { useSelector } from 'react-redux'

import {
  IconButton,
  IconIndent,
  IconLock,
  useTheme
} from '@audius/harmony-native'
import {
  COLLAPSED_PLAY_BAR_INSET,
  COLLAPSE_SHRINK_END,
  FLOATING_BAR_SIDE_MARGIN
} from 'app/components/bottom-tab-bar/constants'
import { LiquidGlassView } from 'app/components/core/Screen/LiquidGlass'
import Text from 'app/components/text'
import { useDrawer } from 'app/hooks/useDrawer'
import {
  useIsTabBarCollapsed,
  useTabBarHiddenProgress
} from 'app/screens/app-screen/TabBarAutoHideContext'
import { makeStyles } from 'app/styles'
import { isDarkTheme, useColor, useThemeVariant } from 'app/utils/theme'
import { zIndex } from 'app/utils/zIndex'

import { LockedStatusBadge } from '../core'
import { TrackImage } from '../image/TrackImage'

import { PlayButton } from './PlayButton'
import { TrackingBar } from './TrackingBar'
import { NOW_PLAYING_HEIGHT, PLAY_BAR_HEIGHT } from './constants'
const { getPreviewing } = playbackSelectors

// Queue button (24px icon plus its padding). Collapses to nothing while the
// play bar sits between the collapsed tab bar's buttons.
const QUEUE_BUTTON_WIDTH = 32

const messages = {
  preview: 'PREVIEW',
  queueLabel: 'Queue'
}

const useStyles = makeStyles(({ palette, spacing }) => ({
  root: {
    width: '100%',
    height: PLAY_BAR_HEIGHT,
    alignItems: 'center',
    zIndex: zIndex.PLAY_BAR
  },
  floatingPillFrame: {
    flex: 1,
    alignSelf: 'stretch'
  },
  floatingPill: {
    flex: 1,
    borderRadius: PLAY_BAR_HEIGHT / 2,
    overflow: 'hidden'
  },
  // Group: Track Content, Queue Button, Play Button
  container: {
    height: '100%',
    width: '100%',
    paddingLeft: spacing(3),
    paddingRight: spacing(2),
    gap: spacing(2),
    flexDirection: 'row',
    alignItems: 'center'
  },
  // Keep the artwork and play button clear of the pill's rounded ends.
  floatingContainer: {
    paddingLeft: spacing(3),
    paddingRight: spacing(3)
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
  queueContainer: {
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden'
  },
  playContainer: {
    flexShrink: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  playIcon: {
    width: spacing(10),
    height: spacing(10)
  },
  // Group: Artwork, Text
  artworkContainer: {
    borderRadius: 8,
    overflow: 'hidden'
  },
  trackTextContainer: {
    flexGrow: 1,
    flexShrink: 1,
    justifyContent: 'center'
  },
  // Group: Title over artist
  title: {
    color: palette.neutral,
    fontSize: 14,
    lineHeight: 18
  },
  artist: {
    color: palette.neutralLight2,
    fontSize: 12,
    lineHeight: 16
  },
  // Artwork interior
  artwork: {
    height: 40,
    width: 40,
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
  user: Nullable<User> | undefined
  onPress: () => void
  translationAnim: Animated.Value
  mediaKey: string
  /** Render as a glass pill above the floating tab bar. */
  floating?: boolean
}

export const PlayBar = (props: PlayBarProps) => {
  const {
    track,
    user,
    onPress,
    translationAnim,
    mediaKey,
    duration,
    floating
  } = props
  const isDarkMode = isDarkTheme(useThemeVariant())
  const styles = useStyles()
  const { spacing } = useTheme()
  const neutral = useColor('neutral')

  const { hasStreamAccess } = useGatedContentAccess(track)
  const isPreviewing = useSelector(getPreviewing)
  const shouldShowPreviewLock =
    isPreviewing ||
    (track?.stream_conditions &&
      'usdc_purchase' in track.stream_conditions &&
      !hasStreamAccess)

  const { onOpen: openQueue } = useDrawer('Queue')
  const {
    showBadge: showQueueNewFeatureBadge,
    dismiss: dismissQueueNewFeatureBadge
  } = useQueueNewFeatureBadge()
  const handleOpenQueue = useCallback(() => {
    if (showQueueNewFeatureBadge) {
      dismissQueueNewFeatureBadge()
    }
    openQueue()
  }, [showQueueNewFeatureBadge, dismissQueueNewFeatureBadge, openQueue])

  // Narrows to fit between the collapsed tab bar's buttons, dropping the queue
  // button to make room for the title.
  const hidden = useTabBarHiddenProgress()
  const isCollapsed = useIsTabBarCollapsed()
  const pillFrameStyle = useAnimatedStyle(() => ({
    marginHorizontal: interpolate(
      hidden.value,
      [0, COLLAPSE_SHRINK_END],
      [FLOATING_BAR_SIDE_MARGIN, COLLAPSED_PLAY_BAR_INSET],
      'clamp'
    )
  }))
  const queueStyle = useAnimatedStyle(() => {
    const shrink = interpolate(
      hidden.value,
      [0, COLLAPSE_SHRINK_END],
      [0, 1],
      'clamp'
    )
    return {
      opacity: interpolate(hidden.value, [0, 0.3], [1, 0], 'clamp'),
      width: QUEUE_BUTTON_WIDTH * (1 - shrink),
      // Fold the row gap in with the button so no extra space is left behind.
      marginLeft: -spacing.s * shrink
    }
  })

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

  const content = (
    <>
      <TrackingBar
        floating={floating}
        duration={duration}
        mediaKey={mediaKey}
        translateYAnimation={translationAnim}
      />
      <View
        style={[styles.container, floating ? styles.floatingContainer : null]}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={styles.trackContainer}
          onPress={onPress}
        >
          {track ? (
            <View style={styles.artworkContainer}>
              {shouldShowPreviewLock ? (
                <View style={styles.lockOverlay}>
                  <IconLock fill={neutral} width={10} height={10} />
                </View>
              ) : null}
              <TrackImage
                trackId={track?.track_id}
                style={styles.artwork}
                size={SquareSizes.SIZE_150_BY_150}
                borderRadius='m'
              />
            </View>
          ) : null}
          <View style={styles.trackTextContainer}>
            <Text numberOfLines={1} weight='bold' style={styles.title}>
              {track?.title ?? ''}
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
        <Reanimated.View
          pointerEvents={floating && isCollapsed ? 'none' : 'auto'}
          style={[styles.queueContainer, floating ? queueStyle : null]}
        >
          <IconButton
            icon={IconIndent}
            onPress={handleOpenQueue}
            size='l'
            color={showQueueNewFeatureBadge ? 'active' : 'default'}
            aria-label={messages.queueLabel}
          />
        </Reanimated.View>
        <View style={styles.playContainer}>
          <PlayButton wrapperStyle={styles.playIcon} />
        </View>
      </View>
    </>
  )

  return (
    <Animated.View style={[styles.root, { opacity: rootOpacityAnimation }]}>
      {floating ? (
        <Reanimated.View style={[styles.floatingPillFrame, pillFrameStyle]}>
          <LiquidGlassView
            effect='regular'
            colorScheme={isDarkMode ? 'dark' : 'light'}
            style={styles.floatingPill}
          >
            {content}
          </LiquidGlassView>
        </Reanimated.View>
      ) : (
        content
      )}
    </Animated.View>
  )
}
