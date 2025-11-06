import type { ComponentType, MouseEventHandler, SVGProps } from 'react'

import type { IconColors } from '../foundations/color/semantic'
import type { ShadowOptions } from '../foundations/shadows'
import { IconSize } from '../foundations/spacing'

type SVGBaseProps = SVGProps<SVGSVGElement>

export type IconProps = {
  color?: IconColors
  colorSecondary?: IconColors
  size?: IconSize
  sizeW?: IconSize
  sizeH?: IconSize
  height?: number
  width?: number
  shadow?: ShadowOptions
  title?: string
  onClick?: MouseEventHandler<SVGSVGElement>
  hex?: boolean
}

export type SVGIconProps = SVGBaseProps & IconProps

export type IconComponent = ComponentType<SVGBaseProps | SVGIconProps>
