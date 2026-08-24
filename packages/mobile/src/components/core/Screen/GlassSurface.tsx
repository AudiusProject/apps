import type { ReactNode } from 'react'

import { BlurView } from '@react-native-community/blur'
import type { ViewProps } from 'react-native'
import { Platform, StyleSheet, View } from 'react-native'
import type { SharedValue } from 'react-native-reanimated'
import Animated, {
  interpolate,
  useAnimatedStyle,
  Extrapolation
} from 'react-native-reanimated'

import { isDarkTheme, useThemeColors, useThemeVariant } from 'app/utils/theme'

/**
 * Opacity of the tint laid over the blur. Mirrors the desktop `Frosted`
 * surface, which sits at 65% of `--harmony-n-25` over a 10px backdrop blur.
 * Slightly higher here because mobile blurs a much busier backdrop (album art
 * scrolling underneath) and the header text has to stay legible at a glance.
 */
const IOS_TINT_OPACITY = 0.72

/**
 * Android does not get a real backdrop blur. `@react-native-community/blur`'s
 * Android implementation is expensive enough to drop frames on a surface that
 * is composited on every scroll frame, and the existing app-wide precedent
 * (ProfileNavOverlay) already falls back to a solid fill there. We use a high
 * -opacity tint instead: content still slides under the header, it just isn't
 * blurred while it does.
 */
const ANDROID_TINT_OPACITY = 0.94

/**
 * Scroll distance (px) over which the bottom edge fades from invisible to
 * fully drawn. Short enough that the edge is there by the time the first tile
 * is meaningfully behind the glass, long enough not to snap.
 */
const EDGE_FADE_DISTANCE = 24

type GlassSurfaceProps = ViewProps & {
  children?: ReactNode
  /** Draw a hairline separator along the bottom edge. */
  showBorder?: boolean
  /**
   * Which edge the separator sits on. Bottom for glass that content scrolls
   * *under* (the header stack), top for glass that content scrolls *behind*
   * from below (the bottom tab bar).
   */
  borderEdge?: 'top' | 'bottom'
  /**
   * Scroll offset of the content behind the glass. When provided, the bottom
   * edge (hairline + soft shadow) is absent at rest and fades in as content
   * slides underneath — so the stack reads flush with the page until there is
   * actually something behind it to separate from. Without it the edge is
   * drawn statically.
   */
  scrollY?: SharedValue<number>
  /** Override the blur radius used on iOS. */
  blurAmount?: number
}

/**
 * A translucent "frosted glass" surface that content scrolls behind.
 *
 * Renders the blur/tint as an absolutely-positioned layer so the caller keeps
 * full control of its own layout — drop it in as the first child of a
 * position-relative container and the surface fills it.
 *
 * iOS gets a genuine backdrop blur; Android gets a near-opaque tint. See the
 * opacity constants above for why.
 */
export const GlassSurface = (props: GlassSurfaceProps) => {
  const {
    children,
    style,
    showBorder = true,
    borderEdge = 'bottom',
    scrollY,
    blurAmount = 20,
    ...other
  } = props
  const isDarkMode = isDarkTheme(useThemeVariant())
  const { backgroundSurface, borderStrong } = useThemeColors()

  const tintOpacity =
    Platform.OS === 'ios' ? IOS_TINT_OPACITY : ANDROID_TINT_OPACITY

  const edgeStyle = useAnimatedStyle(() => {
    // No scrollY (or nothing scrolled yet) → draw the edge statically, which
    // is what non-scrolling callers want.
    if (!scrollY) return { opacity: 1 }
    return {
      opacity: interpolate(
        scrollY.value,
        [0, EDGE_FADE_DISTANCE],
        [0, 1],
        Extrapolation.CLAMP
      )
    }
  })

  return (
    <View style={[styles.root, style]} {...other}>
      <View style={StyleSheet.absoluteFill} pointerEvents='none'>
        {Platform.OS === 'ios' ? (
          <BlurView
            blurType={isDarkMode ? 'dark' : 'light'}
            blurAmount={blurAmount}
            reducedTransparencyFallbackColor={backgroundSurface}
            style={StyleSheet.absoluteFill}
          />
        ) : null}
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: backgroundSurface, opacity: tintOpacity }
          ]}
        />
        {showBorder ? (
          <Animated.View
            style={[
              styles.border,
              borderEdge === 'top' ? styles.borderTop : styles.borderBottom,
              { backgroundColor: borderStrong },
              edgeStyle
            ]}
          />
        ) : null}
      </View>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    position: 'relative'
  },
  border: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    // Soft drop off the hairline so the glass reads as a layer above the
    // content passing under it, not just a ruled line.
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3
  },
  borderBottom: {
    bottom: 0,
    shadowOffset: { width: 0, height: 2 }
  },
  borderTop: {
    top: 0,
    shadowOffset: { width: 0, height: -2 }
  }
})
