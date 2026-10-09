import type { ReactNode } from 'react'
import { useCallback, useId, useMemo, useState } from 'react'

import type {
  LayoutChangeEvent,
  StyleProp,
  ViewProps,
  ViewStyle
} from 'react-native'
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
  /**
   * Bearing in degrees (0 points up, increasing clockwise). Overrides `start`
   * and `end`, and measures the box to place the gradient line like a CSS
   * angle gradient.
   */
  angle?: number
  /** Per-color stop positions in [0, 1]; should match `colors` length. */
  locations?: readonly number[]
  style?: StyleProp<ViewStyle>
  children?: ReactNode
}

// Top to bottom by default.
const DEFAULT_START: LinearGradientPoint = { x: 0.5, y: 0 }
const DEFAULT_END: LinearGradientPoint = { x: 0.5, y: 1 }

const BORDER_RADIUS_KEYS = [
  'borderRadius',
  'borderTopLeftRadius',
  'borderTopRightRadius',
  'borderBottomLeftRadius',
  'borderBottomRightRadius',
  'borderTopStartRadius',
  'borderTopEndRadius',
  'borderBottomStartRadius',
  'borderBottomEndRadius',
  'borderCurve'
] as const

// The gradient line passes through the center along the bearing and is long
// enough that the perpendiculars through opposite corners meet its ends.
export const getAngleStartEnd = (
  angle: number,
  width: number,
  height: number
): { start: LinearGradientPoint; end: LinearGradientPoint } => {
  const w = width > 0 ? width : 1
  const h = height > 0 ? height : 1
  const radians = (angle * Math.PI) / 180
  const sin = Math.sin(radians)
  const cos = Math.cos(radians)
  const halfLength = (w * Math.abs(sin) + h * Math.abs(cos)) / 2
  const dx = (sin * halfLength) / w
  const dy = (cos * halfLength) / h
  return {
    start: { x: 0.5 - dx, y: 0.5 + dy },
    end: { x: 0.5 + dx, y: 0.5 - dy }
  }
}

const styles = StyleSheet.create({
  clip: { overflow: 'hidden' }
})

/**
 * Linear gradient drawn with react-native-svg. `start` and `end` are fractions
 * of the box (objectBoundingBox units), so no layout measurement is needed
 * unless `angle` is set. The gradient renders behind any children and is
 * clipped to the container's border radii.
 */
export const LinearGradient = (props: LinearGradientProps) => {
  const {
    colors,
    locations,
    start: startProp = DEFAULT_START,
    end: endProp = DEFAULT_END,
    angle,
    style,
    children,
    onLayout,
    ...other
  } = props

  const [size, setSize] = useState({ width: 0, height: 0 })
  const handleLayout = useCallback(
    (e: LayoutChangeEvent) => {
      if (angle !== undefined) {
        const { width, height } = e.nativeEvent.layout
        setSize((prev) =>
          prev.width === width && prev.height === height
            ? prev
            : { width, height }
        )
      }
      onLayout?.(e)
    },
    [angle, onLayout]
  )

  const { start, end } =
    angle === undefined
      ? { start: startProp, end: endProp }
      : getAngleStartEnd(angle, size.width, size.height)

  // useId output is not a valid SVG id, so strip it to safe characters.
  const gradientId = `linear-gradient-${useId().replace(/[^\w-]/g, '')}`

  // Clip the gradient (not the children) to the container's corner radii.
  const clipStyle = useMemo(() => {
    const flat = StyleSheet.flatten(style) ?? {}
    const radii = Object.fromEntries(
      BORDER_RADIUS_KEYS.filter((key) => flat[key] !== undefined).map((key) => [
        key,
        flat[key]
      ])
    ) as ViewStyle
    return [StyleSheet.absoluteFill, radii, styles.clip]
  }, [style])

  return (
    <View {...other} style={style} onLayout={handleLayout}>
      <View style={clipStyle} pointerEvents='none'>
        <Svg width='100%' height='100%'>
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
                  offset={
                    locations?.[index] ??
                    (colors.length > 1 ? index / (colors.length - 1) : 0)
                  }
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
      </View>
      {children}
    </View>
  )
}
