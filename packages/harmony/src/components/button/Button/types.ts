import { ComponentPropsWithoutRef } from 'react'

import type { SpecialColors } from '../../../foundations/color'
import { BaseButtonProps } from '../BaseButton/types'

export type HTMLButtonProps = ComponentPropsWithoutRef<'button'>

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'destructive'

export type ButtonSize = 'xs' | 'small' | 'default' | 'large'

export type ButtonProps = {
  /**
   * Override the color of the button, only valid for the `PRIMARY` variant
   */
  color?: SpecialColors

  /**
   * Override the color of the button using any hex color, only valid for the `PRIMARY` variant
   */
  hexColor?: `#${string}`

  /**
   * Override the hover color of the button, only valid for the `PRIMARY` variant
   */
  hoverColor?: SpecialColors

  /**
   * The type of the button
   */
  variant?: ButtonVariant

  /**
   * The button size
   */
  size?: ButtonSize
} & Omit<BaseButtonProps, 'styles'>
