import type { ReactNode } from 'react'
import { useState } from 'react'

import { ScrollView, StyleSheet, Text, useWindowDimensions } from 'react-native'
import type { SharedValue } from 'react-native-reanimated'
import Animated, {
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { GlassCapsule } from 'app/components/core/Screen/GlassCapsule'
import { isLiquidGlassAvailable } from 'app/components/core/Screen/LiquidGlass'
import { makeStyles } from 'app/styles'
import { useThemeColors } from 'app/utils/theme'
import { zIndex } from 'app/utils/zIndex'

/** Height of the compact title pill. */
const COMPACT_TITLE_HEIGHT = 36
/** Height of the glass bar holding a screen's pinned controls: large pills. */
const COMPACT_CONTROLS_HEIGHT = 44
/** Gap between the status bar and the pinned chrome. */
const COMPACT_TOP_GAP = 4
/** Closest the controls bar gets to the screen edges. */
const COMPACT_SIDE_GAP = 8

/** Page-colored tint so pill text stays readable over the list. */
const useCompactTint = () => `${useThemeColors().background.slice(0, 7)}B3`

/** How far compact chrome drifts down as it fades in. */
const FADE_DRIFT = 6

/**
 * Fades compact chrome in as the in-flow header scrolls away.
 *
 * iOS 26 glass stops rendering under a parent that fades from 0, so there
 * only the content fades with scroll, and the glass itself materializes
 * natively (its `effect` switches on) once the chrome is half formed.
 * Everywhere else the whole pill fades.
 */
const useCompactFade = (progress: SharedValue<number>) => {
  const [isShown, setIsShown] = useState(false)
  useAnimatedReaction(
    () => progress.value > 0.5,
    (current, previous) => {
      if (current !== previous) runOnJS(setIsShown)(current)
    }
  )
  const frameStyle = useAnimatedStyle(() => ({
    opacity: isLiquidGlassAvailable ? 1 : progress.value,
    transform: [
      { translateY: -FADE_DRIFT * (1 - progress.value) },
      { scale: 0.96 + 0.04 * progress.value }
    ]
  }))
  const contentStyle = useAnimatedStyle(() => ({
    opacity: isLiquidGlassAvailable ? progress.value : 1
  }))
  return { isShown, frameStyle, contentStyle }
}

const useStyles = makeStyles(({ palette, spacing, typography }) => ({
  titleContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(2),
    paddingHorizontal: spacing(4)
  },
  title: {
    fontSize: 15,
    lineHeight: 20,
    fontFamily: typography.fontByWeight.bold,
    color: palette.neutral
  },
  controlsContent: {
    flex: 1,
    flexDirection: 'row'
  },
  controlsScroll: {
    alignItems: 'center',
    paddingHorizontal: spacing(1.5)
  }
}))

type CompactTitlePillProps = {
  title: string
  progress: SharedValue<number>
}

/**
 * The small glass pill a root screen's header contracts to once its title row
 * has scrolled away. Pinned just under the status bar. Only for screens with
 * no controls row; those pin their controls instead.
 */
export const CompactTitlePill = (props: CompactTitlePillProps) => {
  const { title, progress } = props
  const styles = useStyles()
  const insets = useSafeAreaInsets()
  const floating = useSharedValue(1)
  const tint = useCompactTint()
  const top = insets.top + COMPACT_TOP_GAP
  const { isShown, frameStyle, contentStyle } = useCompactFade(progress)

  return (
    <Animated.View
      pointerEvents='none'
      accessibilityElementsHidden
      importantForAccessibility='no-hide-descendants'
      style={[layout.root, { top }, frameStyle]}
    >
      <GlassCapsule
        height={COMPACT_TITLE_HEIGHT}
        floatProgress={floating}
        tintColor={tint}
        effect={isShown ? 'regular' : 'none'}
        style={layout.capsule}
      >
        <Animated.View style={[styles.titleContent, contentStyle]}>
          <Text numberOfLines={1} style={styles.title}>
            {title}
          </Text>
        </Animated.View>
      </GlassCapsule>
    </Animated.View>
  )
}

type CompactControlsProps = {
  children: ReactNode
  progress: SharedValue<number>
}

/**
 * A screen's controls (tab pills, filter) in a glass bar pinned under the
 * status bar. Rendered by the screen so tab state changes don't rebuild the
 * navigation header.
 */
export const CompactControls = (props: CompactControlsProps) => {
  const { children, progress } = props
  const styles = useStyles()
  const insets = useSafeAreaInsets()
  const floating = useSharedValue(1)
  const tint = useCompactTint()
  const top = insets.top + COMPACT_TOP_GAP
  const { width } = useWindowDimensions()
  const { isShown, frameStyle, contentStyle } = useCompactFade(progress)

  return (
    <Animated.View
      pointerEvents={isShown ? 'box-none' : 'none'}
      style={[layout.root, { top }, frameStyle]}
    >
      <GlassCapsule
        height={COMPACT_CONTROLS_HEIGHT}
        floatProgress={floating}
        tintColor={tint}
        effect={isShown ? 'regular' : 'none'}
        style={[layout.capsule, { maxWidth: width - COMPACT_SIDE_GAP * 2 }]}
      >
        <Animated.View style={[styles.controlsContent, contentStyle]}>
          {/* Scrolls sideways when the pills are wider than the screen. */}
          <ScrollView
            horizontal
            bounces={false}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.controlsScroll}
          >
            {children}
          </ScrollView>
        </Animated.View>
      </GlassCapsule>
    </Animated.View>
  )
}

const layout = StyleSheet.create({
  root: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: zIndex.HEADER_SHADOW
  },
  capsule: {
    alignSelf: 'center',
    // GlassCapsule insets itself 16px from each edge while floating; centered
    // pills size to their content instead.
    marginHorizontal: 0
  }
})
