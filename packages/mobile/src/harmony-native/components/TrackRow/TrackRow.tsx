import type { ReactNode } from 'react'
import { useCallback, useRef } from 'react'

import { useTheme } from '@emotion/react'
import { Pressable, View } from 'react-native'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming
} from 'react-native-reanimated'

import { Skeleton } from '../Skeleton'
import { Text } from '../Text/Text'

export const TRACK_ROW_HEIGHT = 64
const ARTWORK_SIZE = 48
const RANK_WIDTH = 20

// Press settles the row slightly into the page. A long-press dips further
// and springs back, marking the moment the actions open.
const PRESS_SCALE = 0.985
const LONG_PRESS_SCALE = 0.96
const releaseSpring = { damping: 18, stiffness: 320, mass: 0.6 }
const popSpring = { damping: 11, stiffness: 280, mass: 0.7 }

// Skeleton fills its parent absolutely by default; rows lay it out inline.
const skeletonStyle = { position: 'relative' as const, borderRadius: 4 }

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

export type TrackRowProps = {
  /** 1-based position shown before the artwork. Omit for unranked lists. */
  rank?: number
  /** 48px square artwork, including any playing overlay. */
  artwork?: ReactNode
  title?: string
  /** Small element after the title, such as a download indicator. */
  titleAdornment?: ReactNode
  /** Artist line under the title. */
  subtitle?: ReactNode
  /** Shown in place of the duration, e.g. a price button on a locked track. */
  status?: ReactNode
  /** Pre-formatted duration, e.g. "2:30". */
  duration?: string
  /** One short line above the title, such as "Artist Pick". */
  context?: ReactNode
  /** This track is the one loaded in the player. */
  isActive?: boolean
  isLoading?: boolean
  isDisabled?: boolean
  onPress?: () => void
  /** Opens the track's actions. Also exposed to screen readers as an action. */
  onLongPress?: () => void
  /** Accessible name for the row's press action. */
  accessibilityLabel?: string
}

export const TrackRow = (props: TrackRowProps) => {
  const {
    rank,
    artwork,
    title,
    titleAdornment,
    subtitle,
    status,
    duration,
    context,
    isActive,
    isLoading,
    isDisabled,
    onPress,
    onLongPress,
    accessibilityLabel
  } = props
  const { color, spacing, motion } = useTheme()

  const scale = useSharedValue(1)
  const highlight = useSharedValue(0)
  const longPressFiredRef = useRef(false)

  const handlePressIn = useCallback(() => {
    longPressFiredRef.current = false
    scale.value = withTiming(PRESS_SCALE, motion.press)
    highlight.value = withTiming(1, motion.press)
  }, [scale, highlight, motion.press])

  const handlePressOut = useCallback(() => {
    highlight.value = withTiming(0, motion.expressive)
    // The long-press pop already ends at rest; don't cut it short.
    if (longPressFiredRef.current) return
    scale.value = withSpring(1, releaseSpring)
  }, [scale, highlight, motion.expressive])

  const handleLongPress = useCallback(() => {
    if (!onLongPress) return
    longPressFiredRef.current = true
    scale.value = withSequence(
      withTiming(LONG_PRESS_SCALE, motion.quick),
      withSpring(1, popSpring)
    )
    highlight.value = withTiming(0, motion.calm)
    onLongPress()
  }, [onLongPress, scale, highlight, motion.quick, motion.calm])

  const rowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }]
  }))
  const highlightStyle = useAnimatedStyle(() => ({
    opacity: highlight.value
  }))

  const rankCell =
    rank === undefined ? null : (
      <View
        style={{
          width: RANK_WIDTH,
          alignItems: 'center',
          // Sits closer to the artwork than the other cells
          marginRight: -spacing.xs
        }}
      >
        <Text
          variant='body'
          size='m'
          strength='strong'
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
        >
          {rank}
        </Text>
      </View>
    )
  const paddingLeft = rank === undefined ? spacing.l : spacing.m

  if (isLoading) {
    return (
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.m,
          height: TRACK_ROW_HEIGHT,
          paddingLeft,
          paddingRight: spacing.l
        }}
      >
        {rankCell}
        <Skeleton
          noShimmer
          style={{
            ...skeletonStyle,
            width: ARTWORK_SIZE,
            height: ARTWORK_SIZE
          }}
        />
        <View style={{ flex: 1, gap: spacing.xs }}>
          <Skeleton
            noShimmer
            style={{ ...skeletonStyle, width: '60%', height: 14 }}
          />
          <Skeleton
            noShimmer
            style={{ ...skeletonStyle, width: '35%', height: 12 }}
          />
        </View>
      </View>
    )
  }

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onLongPress={onLongPress ? handleLongPress : undefined}
      delayLongPress={300}
      accessibilityRole='button'
      accessibilityLabel={accessibilityLabel}
      accessibilityActions={
        onLongPress ? [{ name: 'longpress', label: 'More options' }] : undefined
      }
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName === 'longpress') onLongPress?.()
      }}
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.m,
          minHeight: TRACK_ROW_HEIGHT,
          paddingVertical: spacing.s,
          paddingLeft,
          paddingRight: spacing.l,
          opacity: isDisabled ? 0.5 : 1
        },
        rowStyle
      ]}
    >
      <Animated.View
        pointerEvents='none'
        style={[
          {
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            backgroundColor: color.background.surface2
          },
          highlightStyle
        ]}
      />
      {rankCell}
      <View
        style={{
          width: ARTWORK_SIZE,
          height: ARTWORK_SIZE,
          borderRadius: 4,
          overflow: 'hidden'
        }}
      >
        {artwork}
      </View>
      <View style={{ flex: 1, minWidth: 0, justifyContent: 'center' }}>
        {context}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.xs
          }}
        >
          <Text
            variant='body'
            size='l'
            strength='strong'
            color={isActive ? 'accent' : 'default'}
            numberOfLines={1}
            style={{ flexShrink: 1 }}
          >
            {title}
          </Text>
          {titleAdornment}
        </View>
        {subtitle}
      </View>
      {status ??
        (duration ? (
          <Text variant='body' size='s' color='subdued'>
            {duration}
          </Text>
        ) : null)}
    </AnimatedPressable>
  )
}
