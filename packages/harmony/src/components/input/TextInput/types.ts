import type { ComponentPropsWithoutRef, ReactNode } from 'react'

import type { IconComponent, IconProps } from '../../icon'

export enum TextInputSize {
  EXTRA_SMALL = 'extra-small',
  SMALL = 'small',
  DEFAULT = 'default'
}

type InternalProps = {
  /**
   * @ignore
   * This prop is for internal use only.
   * Toggles the incorrect error state
   */
  _incorrectError?: boolean
  /**
   * @ignore
   * This prop is for internal use only.
   * Toggles the hover state
   */
  _isHovered?: boolean
  /**
   * @ignore
   * This prop is for internal use only.
   * Toggles the focus state
   */
  _isFocused?: boolean
  /**
   * @ignore
   * This prop is for internal use only.
   * Disabled pointer events
   */
  _disablePointerEvents?: boolean
}

export type TextInputProps = Omit<
  ComponentPropsWithoutRef<'input'>,
  'size' | 'required'
> & {
  /**
   * Input sizes. NOTE: small and extra-small inputs will not show the label
   * @default default
   */
  size?: TextInputSize
  /**
   * Toggles warning state (turns border warning color). NOTE: this is not used any where at the moment
   */
  warning?: boolean
  /**
   * Toggles error state
   */
  error?: boolean
  /**
   * Hides the label. If the label is hidden the placeholder will show by default instead.
   */
  hideLabel?: boolean
  /**
   * When `true` hides the placeholder. Used in `Select`.
   */
  hidePlaceholder?: boolean
  /**
   * Handler for when input is cleared.
   */
  onClear?: () => void
  /**
   * Label Text. Required due to accessibility. If hideLabel is true, the label is set via aria-label
   */
  label: string
  /**
   * ClassName on the div wrapping the whole input container (doesn't include assistive text)
   */
  inputRootClassName?: string
  /**
   * Helper text (or JSX) that shows up below the input
   */
  helperText?: string | ReactNode
  /**
   * Floating text on the lefthand side of the input.
   */
  startAdornmentText?: string
  /**
   * Floating text on the righthand side of the input
   */
  endAdornmentText?: string
  /**
   * Floating icon on the lefthand side of the input. Note: will float to the left of the label & content
   */
  startIcon?: IconComponent
  /**
   * Floating icon on the righthand side of the input
   */
  endIcon?: IconComponent
  /**
   * Override props to supply the start or end Icon
   */
  IconProps?: Partial<IconProps>
  /**
   * @hidden
   * Floating component on the righthand side of the input. Meant for internal use only.
   */
  endAdornment?: ReactNode
  /**
   * Required or not. Will add an * to the label if required
   */
  required?: boolean
  /**
   * 0-1 number representating a percentage threshold to show the max character text. Default is 0.7 (70%)
   * @default 0.7
   */
  showMaxLengthThreshold?: number
  /**
   * 0-1 number representating a percentage threshold to turn the character limit text orange. Default is 0.9 (90%)
   * @default 0.9
   */
  maxLengthWarningThreshold?: number
  /**
   * When `true` elevate the label. Useful for adding custom values. Reference `Select` component
   */
  elevateLabel?: boolean
} & InternalProps
