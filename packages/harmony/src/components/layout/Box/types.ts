import type { CSSProperties, ComponentPropsWithoutRef } from 'react'

import type { BackgroundColors, BorderColors } from '../../../foundations/color'
import type { CornerRadiusOptions } from '../../../foundations/corner-radius'
import type { ShadowOptions } from '../../../foundations/shadows'
import type { SpacingOptions } from '../../../foundations/spacing'

// Custom box props without HTML <div> properties
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
  m?: SpacingOptions
  /** Margin Horizontal */
  mh?: SpacingOptions
  /** Margin Vertical */
  mv?: SpacingOptions
  /** Margin Top */
  mt?: SpacingOptions
  /** Margin Left */
  ml?: SpacingOptions
  /** Margin Right */
  mr?: SpacingOptions
  /** Margin Bottom */
  mb?: SpacingOptions
  /** Background Color */
  backgroundColor?: BackgroundColors
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
