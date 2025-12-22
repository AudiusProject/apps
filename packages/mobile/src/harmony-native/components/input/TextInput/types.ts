import type { ReactNode } from 'react'

import type {
  TextInputProps as RNTextInputProps,
  TextInput as RNTextInput,
  ViewStyle,
  TextStyle
} from 'react-native'

import type { IconComponent, IconProps } from '../../../icons'

export enum TextInputSize {
  EXTRA_SMALL = 'extraSmall',
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

export type TextInputProps = RNTextInputProps & {
  id?: string
  /**
   * Input sizes. NOTE: small and extra_small inputs will not show the label
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
   * @default false
   */
  hideLabel?: boolean
  /**
   * Label Text. Required to provide due to accessibility. If the hideLabel is true, the label used via aria-label
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

  disabled?: boolean

  /**
   * Styles to apply to the inner flex container that wraps the input, label, and adornments
   */
  innerContainerStyle?: TextStyle

  /**
   * Styles to apply to the text component
   */
  textStyle?: ViewStyle

  /**
   * Styles to apply to the text input component
   */
  inputStyle?: TextStyle

  TextInputComponent?: typeof RNTextInput
} & InternalProps
