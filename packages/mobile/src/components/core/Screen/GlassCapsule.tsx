import type { ReactNode } from 'react'

import type { StyleProp, ViewStyle } from 'react-native'
import { Platform, StyleSheet } from 'react-native'
import type { SharedValue } from 'react-native-reanimated'
import Animated, { useAnimatedStyle } from 'react-native-reanimated'

import { isDarkTheme, useThemeColors, useThemeVariant } from 'app/utils/theme'

import { GlassSurface } from './GlassSurface'
import { isLiquidGlassAvailable, LiquidGlassView } from './LiquidGlass'

/** Inset of the floating pill from the screen edges. */
const PILL_SIDE_MARGIN = 16

/**
 * Extra content inset while flat, so the content lines up with the screen's
 * 16px gutter at rest and drifts into the pill as it forms.
 */
const FLAT_CONTENT_INSET = 8

const SHADOW_OPACITY = 0.12
const ANDROID_ELEVATION = 4

type GlassCapsuleProps = {
  children?: ReactNode
  height: number
  style?: StyleProp<ViewStyle>
  /**
   * 0 = flat on the page, 1 = floating pill. The capsule sits flush with the
   * page background at rest and turns into the pill as content scrolls under
   * it. Glass can't fade in from transparent, so it stays drawn the whole
   * time under a page-colored cover that fades out.
   */
  floatProgress: SharedValue<number>
  /**
   * Tints the iOS 26 glass, for pills that sit over busy content where the
   * clear material leaves text hard to read.
   */
  tintColor?: string
}

/**
 * A pill of glass matching the floating tab bar. iOS 26 gets the system
 * material; everywhere else gets a frosted (iOS) or solid (Android)
 * `GlassSurface` clipped to the same shape with a soft shadow.
 */
export const GlassCapsule = (props: GlassCapsuleProps) => {
  const { children, height, style, floatProgress, tintColor } = props
  const isDarkMode = isDarkTheme(useThemeVariant())
  const { background, borderDefault } = useThemeColors()
  const shape = { height, borderRadius: height / 2 }

  const frameStyle = useAnimatedStyle(() => ({
    marginHorizontal: PILL_SIDE_MARGIN * floatProgress.value
  }))
  const contentStyle = useAnimatedStyle(() => ({
    paddingHorizontal: FLAT_CONTENT_INSET * (1 - floatProgress.value)
  }))
  const coverStyle = useAnimatedStyle(() => ({
    opacity: 1 - floatProgress.value
  }))
  const pillOnlyStyle = useAnimatedStyle(() => ({
    opacity: floatProgress.value
  }))
  const shadowStyle = useAnimatedStyle(() => ({
    shadowOpacity: SHADOW_OPACITY * floatProgress.value,
    elevation:
      Platform.OS === 'android' ? ANDROID_ELEVATION * floatProgress.value : 0
  }))

  const content = (
    <>
      <Animated.View
        pointerEvents='none'
        style={[
          StyleSheet.absoluteFill,
          // Theme backgrounds may carry alpha; the cover has to be opaque.
          { backgroundColor: background.slice(0, 7) },
          coverStyle
        ]}
      />
      <Animated.View style={[styles.content, contentStyle]}>
        {children}
      </Animated.View>
    </>
  )

  if (isLiquidGlassAvailable) {
    return (
      <Animated.View style={[frameStyle, style]}>
        <LiquidGlassView
          effect='regular'
          tintColor={tintColor}
          colorScheme={isDarkMode ? 'dark' : 'light'}
          style={[shape, styles.clip]}
        >
          {content}
        </LiquidGlassView>
      </Animated.View>
    )
  }

  // The shadow lives on an unclipped wrapper; the surface inside is clipped
  // to the capsule so the frost doesn't spill past the corners. The edge keeps
  // the pill apart from same-colored cards passing under it in dark mode.
  return (
    <Animated.View
      style={[shape, styles.shadow, frameStyle, shadowStyle, style]}
    >
      <GlassSurface showBorder={false} style={[shape, styles.clip]}>
        {content}
        <Animated.View
          pointerEvents='none'
          style={[
            StyleSheet.absoluteFill,
            styles.edge,
            { borderRadius: height / 2, borderColor: borderDefault },
            pillOnlyStyle
          ]}
        />
      </GlassSurface>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  shadow: {
    shadowColor: '#000',
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 }
  },
  clip: {
    overflow: 'hidden'
  },
  content: {
    flex: 1
  },
  edge: {
    borderWidth: StyleSheet.hairlineWidth
  }
})
