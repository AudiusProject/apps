import type { ReactNode } from 'react'

import type { StyleProp, ViewStyle } from 'react-native'
import { Platform, StyleSheet, View } from 'react-native'

import { isDarkTheme, useThemeVariant } from 'app/utils/theme'

import { GlassSurface } from './GlassSurface'
import { isLiquidGlassAvailable, LiquidGlassView } from './LiquidGlass'

type GlassCapsuleProps = {
  children?: ReactNode
  height: number
  style?: StyleProp<ViewStyle>
}

/**
 * A floating pill of glass, matching the floating tab bar. iOS 26 gets the
 * system material; everywhere else gets a frosted (iOS) or solid (Android)
 * `GlassSurface` clipped to the same shape with a soft shadow.
 */
export const GlassCapsule = (props: GlassCapsuleProps) => {
  const { children, height, style } = props
  const isDarkMode = isDarkTheme(useThemeVariant())
  const shape = { height, borderRadius: height / 2 }

  if (isLiquidGlassAvailable) {
    return (
      <LiquidGlassView
        effect='regular'
        interactive
        colorScheme={isDarkMode ? 'dark' : 'light'}
        style={[shape, style]}
      >
        {children}
      </LiquidGlassView>
    )
  }

  // The shadow lives on an unclipped wrapper; the surface inside is clipped
  // to the capsule so the frost doesn't spill past the corners.
  return (
    <View style={[shape, styles.shadow, style]}>
      <GlassSurface showBorder={false} style={[shape, styles.clip]}>
        {children}
      </GlassSurface>
    </View>
  )
}

const styles = StyleSheet.create({
  shadow: {
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: Platform.OS === 'android' ? 4 : 0
  },
  clip: {
    overflow: 'hidden'
  }
})
