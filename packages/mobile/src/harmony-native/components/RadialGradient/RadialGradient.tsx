import { useId, useState } from 'react'

import { css } from '@emotion/native'
import type { ViewProps } from 'react-native'
import { View } from 'react-native'
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

// RadialGradient that takes its center and radius as percentages instead of
// pixels, which makes it adapt to the laid-out size. Reimplemented on
// react-native-svg because the previous native package
// (react-native-radial-gradient) is unmaintained and has no
// new-architecture support.
export const RadialGradient = (props: RadialGradientProps) => {
  const {
    colors,
    stops,
    center = [50, 50],
    radius = 50,
    style,
    ...other
  } = props
  const [{ height, width }, setDimensions] = useState({ height: 0, width: 0 })

  // useId can contain ':' which is not valid in an SVG id / url(#...) reference.
  const gradientId = `radial-gradient-${useId().replace(/:/g, '')}`

  const cx = (center[0] * width) / 100
  const cy = (center[1] * height) / 100
  // Average width and height so the gradient stays circular — the previous
  // native implementation did the same to avoid ellipse gradients.
  const r = (radius * ((height + width) / 2)) / 100

  return (
    <View
      {...other}
      style={[fullSize, style]}
      onLayout={(e) => setDimensions(e.nativeEvent.layout)}
    >
      {width > 0 && height > 0 ? (
        <Svg width={width} height={height}>
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
                  offset={stops?.[index] ?? index / (colors.length - 1)}
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
    </View>
  )
}
