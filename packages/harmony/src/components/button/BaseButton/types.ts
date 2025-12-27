import type { ComponentPropsWithoutRef } from 'react'

import type { CSSObject } from '@emotion/react'

import type { IconComponent } from '../../icon'

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'destructive'

export type ButtonSize = 'small' | 'default' | 'large'

type BaseButtonStyles = {
  button?: CSSObject
  icon?: CSSObject
}

export type HTMLButtonProps = ComponentPropsWithoutRef<'button'>

/**
 * These props should only be used for dev purposes, whether in debug mode,
 * or to show various states in development.
 * */
type InternalProps = {
  /**
   * @ignore: This prop is for internal use only
   */
  _isHovered?: boolean
  /**
   * @ignore: This prop is for internal use only
   */
  _isPressed?: boolean
}

export type BaseButtonProps = {
  /**
   * Optional icon element to include on the left side of the button
   */
  iconLeft?: IconComponent | null

  /**
   * Optional icon element to include on the right side of the button
   */
  iconRight?: IconComponent | null

  /**
   * When true, do not override icon's fill colors
   */
  isStaticIcon?: boolean
  /**
   * Show a spinning loading state instead of the left icon
   */
  isLoading?: boolean

  /**
   * The max width at which text will still be shown
   */
  widthToHideText?: number

  /**
   * Optional min width
   * Min width can be useful if the button is switching states and you want
   * to keep a certain width while text length changes
   */
  minWidth?: number

  /**
   * If provided, allow button to take up full width of container
   */
  fullWidth?: boolean

  /**
   * Internal styling used by derived button components
   */
  styles?: BaseButtonStyles

  /**
   * Change the default rendered element for the one passed as a child,
   *  merging their props and behavior.
   */
  asChild?: boolean
  slotted?: boolean
} & HTMLButtonProps &
  InternalProps
