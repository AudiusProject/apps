import type { ReactNode } from 'react'

import { StyleSheet, Text, View } from 'react-native'
import type { SharedValue } from 'react-native-reanimated'
import Animated, {
  useAnimatedStyle,
  useSharedValue
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { GlassCapsule } from 'app/components/core/Screen/GlassCapsule'
import { makeStyles } from 'app/styles'
import { useThemeColors } from 'app/utils/theme'
import { zIndex } from 'app/utils/zIndex'

/** Height of the compact title pill. */
export const COMPACT_TITLE_HEIGHT = 36
/** Height of the glass bar holding a screen's compact controls. */
const COMPACT_CONTROLS_HEIGHT = 36
/** Gap between the status bar and the title pill. */
const COMPACT_TOP_GAP = 4
/** Gap between the title pill and the controls under it. */
const COMPACT_STACK_GAP = 6

/** Page-colored tint so pill text stays readable over the list. */
const useCompactTint = () => `${useThemeColors().background.slice(0, 7)}B3`

/**
 * Glass can't fade in from transparent, so compact chrome slides down from
 * above the screen as it forms instead of fading.
 */
const useSlideInStyle = (progress: SharedValue<number>, distance: number) =>
  useAnimatedStyle(() => ({
    transform: [
      { translateY: -distance * (1 - progress.value) },
      { scale: 0.9 + 0.1 * progress.value }
    ]
  }))

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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing(1.5)
  }
}))

type CompactTitlePillProps = {
  title: string
  progress: SharedValue<number>
  /** Shown before the title, e.g. a search icon. */
  leading?: ReactNode
}

/**
 * The small glass pill a root screen's header contracts to once its title row
 * has scrolled away. Pinned just under the status bar.
 */
export const CompactTitlePill = (props: CompactTitlePillProps) => {
  const { title, progress, leading } = props
  const styles = useStyles()
  const insets = useSafeAreaInsets()
  const floating = useSharedValue(1)
  const tint = useCompactTint()
  const top = insets.top + COMPACT_TOP_GAP
  const slideStyle = useSlideInStyle(
    progress,
    top + COMPACT_TITLE_HEIGHT + COMPACT_TOP_GAP
  )

  return (
    <Animated.View
      pointerEvents='none'
      accessibilityElementsHidden
      importantForAccessibility='no-hide-descendants'
      style={[layout.root, { top }, slideStyle]}
    >
      <GlassCapsule
        height={COMPACT_TITLE_HEIGHT}
        floatProgress={floating}
        tintColor={tint}
        style={layout.capsule}
      >
        <View style={styles.titleContent}>
          {leading}
          <Text numberOfLines={1} style={styles.title}>
            {title}
          </Text>
        </View>
      </GlassCapsule>
    </Animated.View>
  )
}

type CompactControlsProps = {
  children: ReactNode
  progress: SharedValue<number>
}

/**
 * A screen's controls (tab pills, filter) in a small glass bar under the
 * compact title pill. Rendered by the screen so tab state changes don't
 * rebuild the navigation header.
 */
export const CompactControls = (props: CompactControlsProps) => {
  const { children, progress } = props
  const styles = useStyles()
  const insets = useSafeAreaInsets()
  const floating = useSharedValue(1)
  const tint = useCompactTint()
  const top =
    insets.top + COMPACT_TOP_GAP + COMPACT_TITLE_HEIGHT + COMPACT_STACK_GAP
  const slideStyle = useSlideInStyle(
    progress,
    top + COMPACT_CONTROLS_HEIGHT + COMPACT_TOP_GAP
  )

  return (
    <Animated.View
      pointerEvents='box-none'
      style={[layout.root, { top }, slideStyle]}
    >
      <GlassCapsule
        height={COMPACT_CONTROLS_HEIGHT}
        floatProgress={floating}
        tintColor={tint}
        style={layout.capsule}
      >
        <View style={styles.controlsContent}>{children}</View>
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
