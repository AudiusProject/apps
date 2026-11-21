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
  cancelAnimation,
  Easing,
  FadeIn,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
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
const ACTIVE_WINDOW_S = 6
const A11Y_STEP_S = 15
const IDLE_MAX_HEIGHT = 14
const IDLE_WAVELENGTH = 18
const IDLE_CYCLE_MS = 1400
const REVEAL_MS = 700
const REVEAL_BAR_SHARE = 0.4

const AnimatedPath = Animated.createAnimatedComponent(Path)

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

const buildPath = (
  barCount: number,
  peaks: number[],
  phase: number,
  reveal: number
) => {
  'worklet'
  let d = ''
  const hasPeaks = peaks.length === barCount
  const stagger = 1 - REVEAL_BAR_SHARE
  for (let i = 0; i < barCount; i++) {
    const wave =
      0.5 + 0.5 * Math.sin(2 * Math.PI * (phase - i / IDLE_WAVELENGTH))
    const idle = MIN_BAR_HEIGHT + wave * (IDLE_MAX_HEIGHT - MIN_BAR_HEIGHT)
    let h = idle
    if (hasPeaks && reveal > 0) {
      const target = Math.max(MIN_BAR_HEIGHT, peaks[i] * HEIGHT)
      const t = Math.min(
        1,
        Math.max(0, (reveal - (i / barCount) * stagger) / REVEAL_BAR_SHARE)
      )
      const eased = 1 - (1 - t) * (1 - t) * (1 - t)
      h = idle + (target - idle) * eased
    }
    h = Math.round(h)
    const x = i * (BAR_WIDTH + BAR_GAP)
    d += `M${x} ${HEIGHT - h}h${BAR_WIDTH}v${h}h-${BAR_WIDTH}z`
  }
  return d
}

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
  mediaKey: string
  isOpen: boolean
  isPlaying: boolean
  comments: TimestampedComment[]
  onPressIn: () => void
  onPressOut: () => void
}

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
  const { color, type } = useTheme()
  const unplayedColor = type === 'day' ? color.neutral.n150 : color.neutral.n300
  const [width, setWidth] = useState(0)
  const [dragFraction, setDragFraction] = useState<number | null>(null)
  const position = usePlaybackSeconds(isOpen && isPlaying, mediaKey)
  const progressX = useSharedValue(0)

  const { data: realPeaks, isFetched: isPeaksSettled } = useTrackWaveformPeaks(
    trackId,
    isOpen
  )

  const barCount = Math.max(0, Math.floor(width / (BAR_WIDTH + BAR_GAP)))
  const isLoading = !isPeaksSettled
  const reduceMotion = useReducedMotion()

  const targetPeaks = useMemo(() => {
    if (!barCount || !isPeaksSettled) return []
    return realPeaks
      ? resampleWaveformPeaks(realPeaks, barCount)
      : makeWaveformPeaks(trackId, barCount)
  }, [trackId, barCount, realPeaks, isPeaksSettled])

  const peaksValue = useSharedValue<number[]>([])
  const phase = useSharedValue(0)
  const reveal = useSharedValue(0)
  const wasLoadingRef = useRef(false)

  useEffect(() => {
    peaksValue.value = targetPeaks
  }, [targetPeaks, peaksValue])

  useEffect(() => {
    if (isLoading) {
      wasLoadingRef.current = true
      reveal.value = 0
      if (isOpen && !reduceMotion) {
        phase.value = 0
        phase.value = withRepeat(
          withTiming(1, { duration: IDLE_CYCLE_MS, easing: Easing.linear }),
          -1
        )
      } else {
        cancelAnimation(phase)
      }
      return
    }
    if (wasLoadingRef.current && !reduceMotion) {
      reveal.value = withTiming(
        1,
        { duration: REVEAL_MS, easing: Easing.linear },
        (finished) => {
          if (finished) cancelAnimation(phase)
        }
      )
    } else {
      cancelAnimation(phase)
      reveal.value = 1
    }
    wasLoadingRef.current = false
  }, [isLoading, isOpen, reduceMotion, phase, reveal])

  const pathProps = useAnimatedProps(() => ({
    d: buildPath(barCount, peaksValue.value, phase.value, reveal.value)
  }))
  const playedPathProps = useAnimatedProps(() => ({
    d: buildPath(barCount, peaksValue.value, phase.value, reveal.value)
  }))

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
      if (x - lastX < AVATAR_SIZE + 2) continue
      placed.push({ comment, x })
      lastX = x
      if (placed.length >= MAX_AVATARS) break
    }
    return placed
  }, [comments, duration, width])

  const latest = useRef({ width, duration, onPressIn, onPressOut })
  latest.current = { width, duration, onPressIn, onPressOut }

  const panResponder = useMemo(() => {
    const toFraction = (e: GestureResponderEvent) =>
      latest.current.width
        ? clamp(e.nativeEvent.locationX / latest.current.width, 0, 1)
        : 0
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
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
        {barCount ? (
          <Animated.View
            pointerEvents='none'
            entering={FadeIn.duration(200)}
            style={StyleSheet.absoluteFill}
          >
            <Svg width={width} height={HEIGHT}>
              <AnimatedPath animatedProps={pathProps} fill={unplayedColor} />
            </Svg>
            <Animated.View style={[styles.fill, fillStyle]}>
              <Svg width={width} height={HEIGHT}>
                <AnimatedPath
                  animatedProps={playedPathProps}
                  fill={color.primary.p300}
                />
              </Svg>
            </Animated.View>
          </Animated.View>
        ) : null}
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
