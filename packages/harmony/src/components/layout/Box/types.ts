import type { CSSProperties, ComponentPropsWithoutRef } from 'react'

import type { BackgroundColors, BorderColors } from '../../../foundations/color'
import type { CornerRadiusOptions } from '../../../foundations/corner-radius'
import type { ShadowOptions } from '../../../foundations/shadows'
import type { SpacingOptions } from '../../../foundations/spacing'

export type BaseBoxProps = {
  /** Height */
  h?: SpacingOptions | CSSProperties['height']
  /** Width */
  w?: SpacingOptions | CSSProperties['width']

  /** Padding */
  p?: SpacingOptions | CSSProperties['padding']
  /** Padding Horizontal */
  ph?: SpacingOptions | CSSProperties['paddingInline']
  /** Padding Vertical */
  pv?: SpacingOptions | CSSProperties['paddingBlock']
  /** Padding Top */
  pt?: SpacingOptions | CSSProperties['paddingTop']
  /** Padding Left */
  pl?: SpacingOptions | CSSProperties['paddingLeft']
  /** Padding Right */
  pr?: SpacingOptions | CSSProperties['paddingRight']
  /** Padding Bottom */
  pb?: SpacingOptions | CSSProperties['paddingBottom']

  /** Margin */
  m?: SpacingOptions | CSSProperties['margin']
  /** Margin Horizontal */
  mh?: SpacingOptions | CSSProperties['marginInline']
  /** Margin Vertical */
  mv?: SpacingOptions | CSSProperties['marginBlock']
  /** Margin Top */
  mt?: SpacingOptions | CSSProperties['marginTop']
  /** Margin Left */
  ml?: SpacingOptions | CSSProperties['marginLeft']
  /** Margin Right */
  mr?: SpacingOptions | CSSProperties['marginRight']
  /** Margin Bottom */
  mb?: SpacingOptions | CSSProperties['marginBottom']
  /** Background Color */
  backgroundColor?: BackgroundColors | 'none'
  /** Border */
  border?: BorderColors
  /** Border Top */
  borderTop?: BorderColors
  /** Border Right */
  borderRight?: BorderColors
  /** Border Bottom */
  borderBottom?: BorderColors
  /** Border Left */
  borderLeft?: BorderColors
  /** Border Radius */
  borderRadius?: CornerRadiusOptions
  /** Border Top Right Radius */
  borderTopRightRadius?: CornerRadiusOptions
  /** Border Bottom Right Radius */
  borderBottomRightRadius?: CornerRadiusOptions
  /** Border Bottom Left Radius */
  borderBottomLeftRadius?: CornerRadiusOptions
  /** Border Top Left Radius */
  borderTopLeftRadius?: CornerRadiusOptions

  /** Elevation Shadow */
  shadow?: ShadowOptions

  flex?: CSSProperties['flex']
  alignSelf?: CSSProperties['alignSelf']
}

export type BoxProps = BaseBoxProps & ComponentPropsWithoutRef<'div'>
