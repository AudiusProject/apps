import type { CSSProperties, FC } from 'react'

import { useTheme } from '@emotion/react'

import { Flex } from '~harmony/components'

import { IconSize, iconSizes } from '../foundations/spacing'
import { roundedHexClipPath } from '../icons/SVGDefs'

const HEXAGON_BORDER_INSET_SCALE = 0.99

export type IconProps = {
  width?: number | string
  height?: number | string
  size?: IconSize
  className?: string
  style?: CSSProperties
  hex?: boolean
}

export const createImageIcon = (src: string) => {
  const Icon: FC<IconProps> = ({
    width,
    height,
    size = 'm',
    className,
    style,
    hex = false
  }) => {
    const { color } = useTheme()
    const finalWidth =
      width ?? (size ? iconSizes[size as keyof typeof iconSizes] : 20)
    const finalHeight =
      height ?? (size ? iconSizes[size as keyof typeof iconSizes] : 20)

    const image = (
      <img
        src={src}
        width={finalWidth}
        height={finalHeight}
        css={{
          clipPath: hex ? `url(#${roundedHexClipPath})` : undefined,
          display: 'block'
        }}
        alt=''
      />
    )

    // If not hexagonal, return the image as-is
    if (!hex) {
      return (
        <img
          src={src}
          width={finalWidth}
          height={finalHeight}
          className={className}
          style={style}
          css={{
            clipPath: hex ? `url(#${roundedHexClipPath})` : undefined
          }}
          alt=''
        />
      )
    }

    // For hexagonal icons, wrap with border
    return (
      <Flex
        className={className}
        style={style}
        css={{
          position: 'relative',
          width: finalWidth,
          height: finalHeight,
          display: 'inline-block'
        }}
      >
        {image}
        <svg
          width={finalWidth}
          height={finalHeight}
          viewBox='0 0 1 1'
          css={{
            position: 'absolute',
            top: 0,
            left: 0,
            pointerEvents: 'none'
          }}
        >
          <g
            transform={`translate(${(1 - HEXAGON_BORDER_INSET_SCALE) / 2}, ${
              (1 - HEXAGON_BORDER_INSET_SCALE) / 2
            }) scale(${HEXAGON_BORDER_INSET_SCALE})`}
          >
            <path
              d='M0.966 0.378C0.93 0.301 0.887 0.228 0.839 0.158L0.824 0.136C0.805 0.108 0.779 0.085 0.75 0.068C0.721 0.051 0.688 0.041 0.655 0.039L0.627 0.036C0.543 0.03 0.457 0.03 0.373 0.036L0.346 0.039C0.312 0.041 0.279 0.051 0.25 0.068C0.221 0.085 0.196 0.108 0.177 0.136L0.161 0.158C0.113 0.228 0.07 0.302 0.034 0.378L0.022 0.403C0.008 0.433 0 0.466 0 0.5C0 0.534 0.008 0.567 0.022 0.597L0.034 0.622C0.07 0.698 0.113 0.772 0.161 0.842L0.177 0.864C0.196 0.892 0.221 0.915 0.25 0.932C0.279 0.949 0.312 0.959 0.346 0.961L0.373 0.964C0.457 0.97 0.543 0.97 0.627 0.964L0.655 0.961C0.688 0.959 0.721 0.949 0.75 0.932C0.779 0.915 0.805 0.892 0.824 0.864L0.839 0.842C0.887 0.772 0.93 0.698 0.966 0.622L0.978 0.597C0.992 0.567 1 0.534 1 0.5C1 0.466 0.992 0.433 0.978 0.403L0.966 0.378Z'
              fill='none'
              opacity={0.3}
              stroke={color.neutral.n950}
              strokeWidth={`${
                1 / Math.max(finalWidth as number, finalHeight as number)
              }`}
            />
          </g>
        </svg>
      </Flex>
    )
  }
  return Icon
}
