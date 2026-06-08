import type { StyleProp, ViewStyle } from 'react-native'

import type { SpecialColors } from '@audius/harmony-native'

import type { BaseButtonProps } from '../BaseButton/types'

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'destructive'

export type ButtonSize = 'xs' | 'small' | 'default'
export type HexColor = `#${string}`

export type ButtonProps = {
  /**
   * Override the color of the button, only valid for the `PRIMARY` variant
   */
  color?: Exclude<SpecialColors, 'gradient'>

  /**
   * Override the color of the button using any hex color, only valid for the `PRIMARY` variant
   */
  hexColor?: HexColor

  /**
   * The type of the button
   */
  variant?: ButtonVariant

  /**
   * The button size
   */
  size?: ButtonSize

  /**
   * When true, uses fully rounded (pill-shaped) corners
   */
  rounded?: boolean

  style?: StyleProp<ViewStyle>
} & Omit<BaseButtonProps, 'styles'>
