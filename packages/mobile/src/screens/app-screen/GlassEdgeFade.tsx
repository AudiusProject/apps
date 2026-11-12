import type { ComponentProps } from 'react'
import { useId } from 'react'

import { StyleSheet } from 'react-native'
import Animated from 'react-native-reanimated'
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg'

import { useThemeColors } from 'app/utils/theme'

/** Background opacity at the very top, behind the status bar. */
export const EDGE_FADE_FROM_OPACITY = 0.94

/** How far a fade reaches past the chrome it sits behind. */
export const EDGE_FADE_TAIL = 16

type GlassEdgeFadeProps = {
  height: number
  /** Opacity of the page background at the top and bottom of the fade. */
  fromOpacity: number
  toOpacity: number
  style?: ComponentProps<typeof Animated.View>['style']
}

/**
 * Fades the page background over the content scrolling under the floating
 * chrome, so text passing beneath the status bar and the glass capsules
 * doesn't collide with them. Replaces the full-width frosted slab.
 *
 * Drawn with `stopOpacity` rather than harmony's `LinearGradient`, because
 * react-native-svg ignores the alpha channel of a stop's color.
 */
export const GlassEdgeFade = (props: GlassEdgeFadeProps) => {
  const { height, fromOpacity, toOpacity, style } = props
  const { background } = useThemeColors()
  // Theme backgrounds are #RRGGBB or #RRGGBBAA; the stops carry the alpha.
  const color = background.slice(0, 7)
  const gradientId = `glass-edge-fade-${useId().replace(/[^\w-]/g, '')}`

  return (
    <Animated.View
      pointerEvents='none'
      style={[styles.root, { height }, style]}
    >
      <Svg width='100%' height='100%'>
        <Defs>
          <LinearGradient id={gradientId} x1={0} y1={0} x2={0} y2={1}>
            <Stop offset={0} stopColor={color} stopOpacity={fromOpacity} />
            <Stop offset={1} stopColor={color} stopOpacity={toOpacity} />
          </LinearGradient>
        </Defs>
        <Rect
          x={0}
          y={0}
          width='100%'
          height='100%'
          fill={`url(#${gradientId})`}
        />
      </Svg>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0
  }
})
