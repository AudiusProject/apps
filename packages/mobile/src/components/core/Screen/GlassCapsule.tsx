import type { ReactNode } from 'react'

import type { StyleProp, ViewStyle } from 'react-native'
import { Platform, StyleSheet } from 'react-native'
import type { SharedValue } from 'react-native-reanimated'
import Animated, { useAnimatedStyle } from 'react-native-reanimated'

import { isDarkTheme, useThemeColors, useThemeVariant } from 'app/utils/theme'

import { GlassSurface } from './GlassSurface'
import { isLiquidGlassAvailable, LiquidGlassView } from './LiquidGlass'

const PILL_SIDE_MARGIN = 16

const FLAT_CONTENT_INSET = 8

const SHADOW_OPACITY = 0.12
const ANDROID_ELEVATION = 4

type GlassCapsuleProps = {
  children?: ReactNode
  height: number
  style?: StyleProp<ViewStyle>
  floatProgress: SharedValue<number>
  tintColor?: string
  effect?: 'regular' | 'none'
}

export const GlassCapsule = (props: GlassCapsuleProps) => {
  const {
    children,
    height,
    style,
    floatProgress,
    tintColor,
    effect = 'regular'
  } = props
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
          effect={effect}
          tintColor={tintColor}
          colorScheme={isDarkMode ? 'dark' : 'light'}
          style={[shape, styles.clip]}
        >
          {content}
        </LiquidGlassView>
      </Animated.View>
    )
  }

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
