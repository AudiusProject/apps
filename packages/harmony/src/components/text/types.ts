import type {
  CSSProperties,
  ComponentProps,
  ElementType,
  ReactNode
} from 'react'

import type { TextColors } from '../../foundations/color/semantic'

export type BaseTextProps<TextComponentType extends ElementType = 'p'> = {
  tag?: TextComponentType
  className?: string
  children?: ReactNode
  variant?: TextVariant
  size?: TextSize
  strength?: TextStrength
  color?: TextColors | 'inherit'
  shadow?: TextShadow
  asChild?: boolean
  textAlign?: CSSProperties['textAlign']
  ellipses?: boolean
  maxLines?: number
  textTransform?: CSSProperties['textTransform']
  lineHeight?: 'single' | 'multi'
  userSelect?: CSSProperties['userSelect']
}

export type TextProps<TextComponentType extends ElementType = 'p'> =
  BaseTextProps<TextComponentType> &
    Omit<ComponentProps<TextComponentType>, keyof BaseTextProps | 'ref'>

export type TextStrength = 'weak' | 'default' | 'strong'

export type TextSize = 'xl' | 'l' | 'm' | 's' | 'xs'

export type TextVariant = 'display' | 'heading' | 'title' | 'label' | 'body'
export type TextShadow = 'emphasis'
export type VariantSizeTagMap = Partial<Record<TextSize, ElementType>>
