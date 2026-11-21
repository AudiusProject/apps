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

const IOS_TINT_OPACITY = 0.72

const EDGE_FADE_DISTANCE = 24

type GlassSurfaceProps = ViewProps & {
  children?: ReactNode
  showBorder?: boolean
  borderEdge?: 'top' | 'bottom'
  scrollY?: SharedValue<number>
  blurAmount?: number
}

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

  const edgeStyle = useAnimatedStyle(() => {
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

  const androidTint =
    Platform.OS === 'android' ? { backgroundColor: backgroundSurface } : null

  return (
    <View style={[styles.root, androidTint, style]} {...other}>
      <View style={StyleSheet.absoluteFill} pointerEvents='none'>
        {Platform.OS === 'ios' ? (
          <BlurView
            blurType={isDarkMode ? 'dark' : 'light'}
            blurAmount={blurAmount}
            reducedTransparencyFallbackColor={backgroundSurface}
            style={StyleSheet.absoluteFill}
          />
        ) : null}
        {Platform.OS === 'ios' ? (
          <View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: backgroundSurface, opacity: IOS_TINT_OPACITY }
            ]}
          />
        ) : null}
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
    shadowOffset: { width: 0, height: -2 },
    elevation: 0
  }
})
