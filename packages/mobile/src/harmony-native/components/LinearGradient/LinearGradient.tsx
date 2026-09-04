import type { ReactNode } from 'react'
import { useId } from 'react'

import type { StyleProp, ViewProps, ViewStyle } from 'react-native'
import { StyleSheet, View } from 'react-native'
import Svg, {
  Defs,
  LinearGradient as SvgLinearGradient,
  Rect,
  Stop
} from 'react-native-svg'

export type LinearGradientPoint = { x: number; y: number }

export type LinearGradientProps = Omit<ViewProps, 'children'> & {
  /** Two or more colors, evenly spaced unless `locations` is provided. */
  colors: readonly string[]
  /** Gradient start as a fraction of the box. Defaults to the top edge. */
  start?: LinearGradientPoint
  /** Gradient end as a fraction of the box. Defaults to the bottom edge. */
  end?: LinearGradientPoint
  /** Per-color stop positions in [0, 1]; should match `colors` length. */
  locations?: readonly number[]
  style?: StyleProp<ViewStyle>
  children?: ReactNode
}

// Match react-native-linear-gradient's default vertical (top -> bottom) sweep.
const DEFAULT_START: LinearGradientPoint = { x: 0.5, y: 0 }
const DEFAULT_END: LinearGradientPoint = { x: 0.5, y: 1 }

/**
 * Drop-in replacement for react-native-linear-gradient / expo-linear-gradient,
 * implemented on react-native-svg — which is already linked and
 * new-architecture ready, unlike the unmaintained native gradient packages and
 * Expo modules (this app isn't wired for Expo native autolinking).
 *
 * `start`/`end` are fractions of the box, mapped via SVG's default
 * `objectBoundingBox` units, so no layout measurement is needed. The gradient
 * is an absolutely-positioned SVG rendered behind any children, so the
 * component works both as a fill and as a container.
 */
export const LinearGradient = (props: LinearGradientProps) => {
  const {
    colors,
    locations,
    start = DEFAULT_START,
    end = DEFAULT_END,
    style,
    children,
    ...other
  } = props

  // useId can contain ':' which is not valid in an SVG id / url(#...) reference.
  const gradientId = `linear-gradient-${useId().replace(/:/g, '')}`

  return (
    <View {...other} style={style}>
      <Svg
        style={StyleSheet.absoluteFill}
        width='100%'
        height='100%'
        pointerEvents='none'
      >
        <Defs>
          <SvgLinearGradient
            id={gradientId}
            x1={start.x}
            y1={start.y}
            x2={end.x}
            y2={end.y}
          >
            {colors.map((color, index) => (
              <Stop
                key={index}
                offset={locations?.[index] ?? index / (colors.length - 1)}
                stopColor={color}
              />
            ))}
          </SvgLinearGradient>
        </Defs>
        <Rect
          x={0}
          y={0}
          width='100%'
          height='100%'
          fill={`url(#${gradientId})`}
        />
      </Svg>
      {children}
    </View>
  )
}
