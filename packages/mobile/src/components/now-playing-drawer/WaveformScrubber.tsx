import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import {
  useTrackWaveformPeaks,
  useUser,
  type TimestampedComment
} from '@audius/common/api'
import type { ID } from '@audius/common/models'
import { playbackActions, playbackSelectors } from '@audius/common/store'
import {
  formatSeconds,
  makeWaveformPeaks,
  resampleWaveformPeaks
} from '@audius/common/utils'
import type {
  AccessibilityActionEvent,
  GestureResponderEvent,
  LayoutChangeEvent
} from 'react-native'
import { PanResponder, Pressable, StyleSheet, View } from 'react-native'
import Animated, {
  Easing,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withTiming
} from 'react-native-reanimated'
import Svg, { Path } from 'react-native-svg'
import TrackPlayer from 'react-native-track-player'
import { useDispatch, useSelector } from 'react-redux'

import { Flex, Text, useTheme } from '@audius/harmony-native'
import { useCommentDrawer } from 'app/components/comments/CommentDrawerContext'
import { ProfilePicture } from 'app/components/core'
import { light } from 'app/haptics'
import { useNavigation } from 'app/hooks/useNavigation'

const { seekTo } = playbackActions
const { getSeek, getSeekCounter } = playbackSelectors

const messages = {
  seek: 'Seek',
  openComment: (name: string) => `Open comment by ${name}`
}

const HEIGHT = 48
const BAR_WIDTH = 3
const BAR_GAP = 2
const MIN_BAR_HEIGHT = 3
const AVATAR_SIZE = 22
const MAX_AVATARS = 20
const POLL_MS = 250
/** How long an avatar stays highlighted after its timestamp plays. */
const ACTIVE_WINDOW_S = 6
/** Accessibility increment/decrement step. */
const A11Y_STEP_S = 15

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

const buildPath = (peaks: number[]) => {
  let d = ''
  for (let i = 0; i < peaks.length; i++) {
    const h = Math.max(MIN_BAR_HEIGHT, Math.round(peaks[i] * HEIGHT))
    const x = i * (BAR_WIDTH + BAR_GAP)
    d += `M${x} ${HEIGHT - h}h${BAR_WIDTH}v${h}h-${BAR_WIDTH}z`
  }
  return d
}

/**
 * Playback position in seconds, polled from the native player while active
 * and snapped to seeks. Fractional so the progress fill moves smoothly.
 */
const usePlaybackSeconds = (isActive: boolean, mediaKey: string) => {
  const [position, setPosition] = useState(0)
  const seek = useSelector(getSeek)
  const seekCounter = useSelector(getSeekCounter)

  useEffect(() => {
    setPosition(0)
  }, [mediaKey])

  useEffect(() => {
    if (seek !== null) setPosition(seek)
  }, [seek, seekCounter])

  useEffect(() => {
    let cancelled = false
    const tick = async () => {
      const { position } = await TrackPlayer.getProgress()
      if (!cancelled) setPosition(position)
    }
    // Read once even when paused, so reopening the drawer shows the real spot.
    tick()
    if (!isActive) return
    const interval = setInterval(tick, POLL_MS)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [isActive, mediaKey])

  return position
}

type CommentAvatarProps = {
  trackId: ID
  comment: TimestampedComment
  x: number
  isActive: boolean
}

const CommentAvatar = (props: CommentAvatarProps) => {
  const { trackId, comment, x, isActive } = props
  const navigation = useNavigation()
  const { open } = useCommentDrawer()
  const { color } = useTheme()
  const { data: name } = useUser(comment.userId, {
    select: (user) => user.name
  })

  const handlePress = useCallback(() => {
    open({
      entityId: trackId,
      navigation,
      playbackSource: 'comments',
      highlightedComment: comment
    })
  }, [open, trackId, navigation, comment])

  if (!name) return null

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      style={[
        styles.avatar,
        { left: x - AVATAR_SIZE / 2 },
        isActive
          ? {
              transform: [{ scale: 1.25 }],
              borderColor: color.primary.p300,
              zIndex: 2
            }
          : { borderColor: color.background.white }
      ]}
    >
      <Pressable
        onPress={handlePress}
        hitSlop={8}
        accessibilityRole='button'
        accessibilityLabel={messages.openComment(name)}
      >
        <ProfilePicture
          userId={comment.userId}
          size='auto'
          w={AVATAR_SIZE - 4}
          h={AVATAR_SIZE - 4}
          borderWidth='thin'
        />
      </Pressable>
    </Animated.View>
  )
}

type WaveformScrubberProps = {
  trackId: ID
  duration: number
  /** Changes when the same track replays, to reset the position. */
  mediaKey: string
  /** Fetch peaks and poll position only while the player is open. */
  isOpen: boolean
  isPlaying: boolean
  comments: TimestampedComment[]
  onPressIn: () => void
  onPressOut: () => void
}

/**
 * The Now Playing scrubber as a waveform, like the desktop track tiles: drag
 * or tap to seek, and timestamped comments sit under it as avatars that open
 * the comment.
 */
export const WaveformScrubber = (props: WaveformScrubberProps) => {
  const {
    trackId,
    duration,
    mediaKey,
    isOpen,
    isPlaying,
    comments,
    onPressIn,
    onPressOut
  } = props
  const dispatch = useDispatch()
  const { color } = useTheme()
  const [width, setWidth] = useState(0)
  const [dragFraction, setDragFraction] = useState<number | null>(null)
  const position = usePlaybackSeconds(isOpen && isPlaying, mediaKey)
  const progressX = useSharedValue(0)

  // Settles to null on a miss or error; either way the fallback shape draws.
  const { data: realPeaks, isFetched: isPeaksSettled } = useTrackWaveformPeaks(
    trackId,
    isOpen
  )

  const barCount = Math.max(0, Math.floor(width / (BAR_WIDTH + BAR_GAP)))
  // Wait for the lookup so a real shape never replaces a fake one on screen.
  const path = useMemo(() => {
    if (!barCount || !isPeaksSettled) return ''
    return buildPath(
      realPeaks
        ? resampleWaveformPeaks(realPeaks, barCount)
        : makeWaveformPeaks(trackId, barCount)
    )
  }, [trackId, barCount, realPeaks, isPeaksSettled])

  const fraction =
    dragFraction ?? (duration > 0 ? clamp(position / duration, 0, 1) : 0)

  useEffect(() => {
    progressX.value =
      dragFraction !== null || !isPlaying
        ? fraction * width
        : withTiming(fraction * width, {
            duration: POLL_MS,
            easing: Easing.linear
          })
  }, [fraction, width, isPlaying, dragFraction, progressX])

  const fillStyle = useAnimatedStyle(() => ({ width: progressX.value }))

  const avatars = useMemo(() => {
    if (!width || !duration) return []
    const placed: { comment: TimestampedComment; x: number }[] = []
    let lastX = -Infinity
    for (const comment of comments) {
      const x = clamp(
        (comment.trackTimestampS / duration) * width,
        AVATAR_SIZE / 2,
        width - AVATAR_SIZE / 2
      )
      // Keep neighbours from stacking; the first comment at a spot wins.
      if (x - lastX < AVATAR_SIZE + 2) continue
      placed.push({ comment, x })
      lastX = x
      if (placed.length >= MAX_AVATARS) break
    }
    return placed
  }, [comments, duration, width])

  // Refs so the responder, created once, sees current values.
  const latest = useRef({ width, duration, onPressIn, onPressOut })
  latest.current = { width, duration, onPressIn, onPressOut }

  const panResponder = useMemo(() => {
    // Children don't take touches, so locationX is always relative to the
    // waveform itself.
    const toFraction = (e: GestureResponderEvent) =>
      latest.current.width
        ? clamp(e.nativeEvent.locationX / latest.current.width, 0, 1)
        : 0
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      // Hold on to the touch so the drawer's swipe-to-close can't take it.
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => {
        latest.current.onPressIn()
        setDragFraction(toFraction(e))
      },
      onPanResponderMove: (e) => {
        setDragFraction(toFraction(e))
      },
      onPanResponderRelease: (e) => {
        const seconds = toFraction(e) * latest.current.duration
        if (latest.current.duration) dispatch(seekTo({ seconds }))
        light()
        setDragFraction(null)
        latest.current.onPressOut()
      },
      onPanResponderTerminate: () => {
        setDragFraction(null)
        latest.current.onPressOut()
      }
    })
  }, [dispatch])

  const handleAccessibilityAction = useCallback(
    (event: AccessibilityActionEvent) => {
      const step =
        event.nativeEvent.actionName === 'increment'
          ? A11Y_STEP_S
          : -A11Y_STEP_S
      dispatch(
        seekTo({ seconds: clamp(position + step, 0, duration || position) })
      )
    },
    [dispatch, position, duration]
  )

  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    setWidth(e.nativeEvent.layout.width)
  }, [])

  const displaySeconds = fraction * duration

  return (
    <Flex gap='xs'>
      <View
        onLayout={handleLayout}
        style={styles.waveform}
        accessible
        accessibilityRole='adjustable'
        accessibilityLabel={messages.seek}
        accessibilityValue={{
          min: 0,
          max: Math.round(duration),
          now: Math.round(displaySeconds),
          text: `${formatSeconds(displaySeconds)} of ${formatSeconds(duration)}`
        }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={handleAccessibilityAction}
        hitSlop={{ top: 8, bottom: 8 }}
        {...panResponder.panHandlers}
      >
        {path ? (
          <Animated.View
            pointerEvents='none'
            entering={FadeIn.duration(200)}
            style={StyleSheet.absoluteFill}
          >
            <Svg width={width} height={HEIGHT}>
              <Path d={path} fill={color.neutral.n150} />
            </Svg>
            <Animated.View style={[styles.fill, fillStyle]}>
              <Svg width={width} height={HEIGHT}>
                <Path d={path} fill={color.primary.p300} />
              </Svg>
            </Animated.View>
          </Animated.View>
        ) : (
          // A thin rail while the peaks lookup is pending, so there's
          // something to aim at.
          <View
            pointerEvents='none'
            style={[styles.rail, { backgroundColor: color.neutral.n150 }]}
          >
            <Animated.View
              style={[
                styles.fill,
                fillStyle,
                { backgroundColor: color.primary.p300 }
              ]}
            />
          </View>
        )}
      </View>
      <View style={styles.avatarRow}>
        {avatars.map(({ comment, x }) => (
          <CommentAvatar
            key={comment.id}
            trackId={trackId}
            comment={comment}
            x={x}
            isActive={
              position >= comment.trackTimestampS &&
              position - comment.trackTimestampS < ACTIVE_WINDOW_S
            }
          />
        ))}
      </View>
      <Flex row justifyContent='space-between'>
        <Text variant='body' size='xs' color='subdued'>
          {formatSeconds(displaySeconds)}
        </Text>
        <Text variant='body' size='xs' color='subdued'>
          {formatSeconds(duration)}
        </Text>
      </Flex>
    </Flex>
  )
}

const styles = StyleSheet.create({
  waveform: {
    height: HEIGHT,
    width: '100%'
  },
  fill: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    overflow: 'hidden'
  },
  rail: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: MIN_BAR_HEIGHT,
    borderRadius: MIN_BAR_HEIGHT / 2,
    overflow: 'hidden'
  },
  avatarRow: {
    height: AVATAR_SIZE,
    width: '100%'
  },
  avatar: {
    position: 'absolute',
    top: 0,
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden'
  }
})
