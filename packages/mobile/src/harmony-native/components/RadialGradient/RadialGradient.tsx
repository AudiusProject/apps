import { useId, useState } from 'react'

import { css } from '@emotion/native'
import type { ViewProps } from 'react-native'
import { StyleSheet, View } from 'react-native'
import Svg, {
  Defs,
  RadialGradient as SvgRadialGradient,
  Rect,
  Stop
} from 'react-native-svg'

const fullSize = css({ height: '100%', width: '100%' })

export type RadialGradientProps = ViewProps & {
  colors: string[]
  center?: number[]
  stops?: number[]
  radius?: number
}

// RadialGradient that takes its center and radius as percentages of the
// laid-out size instead of pixels. Drawn with react-native-svg behind any
// children.
export const RadialGradient = (props: RadialGradientProps) => {
  const {
    colors,
    stops,
    center = [50, 50],
    radius = 50,
    style,
    children,
    onLayout,
    ...other
  } = props
  const [{ height, width }, setDimensions] = useState({ height: 0, width: 0 })

  // useId output is not a valid SVG id, so strip it to safe characters.
  const gradientId = `radial-gradient-${useId().replace(/[^\w-]/g, '')}`

  const cx = (center[0] * width) / 100
  const cy = (center[1] * height) / 100
  // Use the average of width and height so the gradient stays circular.
  const r = (radius * ((height + width) / 2)) / 100

  return (
    <View
      {...other}
      style={[fullSize, style]}
      onLayout={(e) => {
        setDimensions(e.nativeEvent.layout)
        onLayout?.(e)
      }}
    >
      {width > 0 && height > 0 ? (
        <Svg
          width={width}
          height={height}
          style={StyleSheet.absoluteFill}
          pointerEvents='none'
        >
          <Defs>
            <SvgRadialGradient
              id={gradientId}
              cx={cx}
              cy={cy}
              r={r}
              gradientUnits='userSpaceOnUse'
            >
              {colors.map((color, index) => (
                <Stop
                  key={index}
                  offset={
                    stops?.[index] ??
                    (colors.length > 1 ? index / (colors.length - 1) : 0)
                  }
                  stopColor={color}
                />
              ))}
            </SvgRadialGradient>
          </Defs>
          <Rect
            x={0}
            y={0}
            width={width}
            height={height}
            fill={`url(#${gradientId})`}
          />
        </Svg>
      ) : null}
      {children}
    </View>
  )
}
