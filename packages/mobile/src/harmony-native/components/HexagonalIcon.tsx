import type { ReactElement } from 'react'
import { cloneElement } from 'react'

import MaskedView from '@react-native-masked-view/masked-view'
import { View } from 'react-native'
import Svg, { Path, G } from 'react-native-svg'

import { useTheme } from '../foundations'
import type { IconProps } from '../icons'

type HexagonalIconProps = {
  children: ReactElement<IconProps>
  size: number
}

export const HexagonalIcon = ({ children, size }: HexagonalIconProps) => {
  const { color } = useTheme()

  const HexagonalMask = () => (
    <Svg width={size} height={size} viewBox='0 0 1 1'>
      <Path
        d='M0.966 0.378C0.93 0.301 0.887 0.228 0.839 0.158L0.824 0.136C0.805 0.108 0.779 0.085 0.75 0.068C0.721 0.051 0.688 0.041 0.655 0.039L0.627 0.036C0.543 0.03 0.457 0.03 0.373 0.036L0.346 0.039C0.312 0.041 0.279 0.051 0.25 0.068C0.221 0.085 0.196 0.108 0.177 0.136L0.161 0.158C0.113 0.228 0.07 0.302 0.034 0.378L0.022 0.403C0.008 0.433 0 0.466 0 0.5C0 0.534 0.008 0.567 0.022 0.597L0.034 0.622C0.07 0.698 0.113 0.772 0.161 0.842L0.177 0.864C0.196 0.892 0.221 0.915 0.25 0.932C0.279 0.949 0.312 0.959 0.346 0.961L0.373 0.964C0.457 0.97 0.543 0.97 0.627 0.964L0.655 0.961C0.688 0.959 0.721 0.949 0.75 0.932C0.779 0.915 0.805 0.892 0.824 0.864L0.839 0.842C0.887 0.772 0.93 0.698 0.966 0.622L0.978 0.597C0.992 0.567 1 0.534 1 0.5C1 0.466 0.992 0.433 0.978 0.403L0.966 0.378Z'
        fill='white'
      />
    </Svg>
  )

  const HexagonalBorder = () => {
    const insetScale = 0.99
    const centerOffset = (1 - insetScale) / 2

    return (
      <Svg
        width={size}
        height={size}
        viewBox='0 0 1 1'
        style={{ position: 'absolute', top: 0, left: 0 }}
      >
        <G
          transform={`translate(${centerOffset}, ${centerOffset}) scale(${insetScale})`}
        >
          <Path
            d='M0.966 0.378C0.93 0.301 0.887 0.228 0.839 0.158L0.824 0.136C0.805 0.108 0.779 0.085 0.75 0.068C0.721 0.051 0.688 0.041 0.655 0.039L0.627 0.036C0.543 0.03 0.457 0.03 0.373 0.036L0.346 0.039C0.312 0.041 0.279 0.051 0.25 0.068C0.221 0.085 0.196 0.108 0.177 0.136L0.161 0.158C0.113 0.228 0.07 0.302 0.034 0.378L0.022 0.403C0.008 0.433 0 0.466 0 0.5C0 0.534 0.008 0.567 0.022 0.597L0.034 0.622C0.07 0.698 0.113 0.772 0.161 0.842L0.177 0.864C0.196 0.892 0.221 0.915 0.25 0.932C0.279 0.949 0.312 0.959 0.346 0.961L0.373 0.964C0.457 0.97 0.543 0.97 0.627 0.964L0.655 0.961C0.688 0.959 0.721 0.949 0.75 0.932C0.779 0.915 0.805 0.892 0.824 0.864L0.839 0.842C0.887 0.772 0.93 0.698 0.966 0.622L0.978 0.597C0.992 0.567 1 0.534 1 0.5C1 0.466 0.992 0.433 0.978 0.403L0.966 0.378Z'
            fill='none'
            stroke={color.neutral.n950}
            opacity={0.3}
            strokeWidth={1 / size}
          />
        </G>
      </Svg>
    )
  }

  const maskedContent = (
    <MaskedView maskElement={<HexagonalMask />}>
      {cloneElement(children, {
        ...children.props,
        height: size,
        width: size
      })}
    </MaskedView>
  )

  return (
    <View style={{ position: 'relative', width: size, height: size }}>
      {maskedContent}
      <HexagonalBorder />
    </View>
  )
}
