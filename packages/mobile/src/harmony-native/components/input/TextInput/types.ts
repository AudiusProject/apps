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
  _incorrectError?: boolean
  _isFocused?: boolean
  _disablePointerEvents?: boolean
}

export type TextInputProps = RNTextInputProps & {
  id?: string
  size?: TextInputSize
  warning?: boolean
  error?: boolean
  hideLabel?: boolean
  label: string
  inputRootClassName?: string
  helperText?: string | ReactNode
  startAdornmentText?: string
  endAdornmentText?: string
  startIcon?: IconComponent
  endIcon?: IconComponent
  IconProps?: Partial<IconProps>
  endAdornment?: ReactNode
  required?: boolean
  showMaxLengthThreshold?: number
  maxLengthWarningThreshold?: number

  disabled?: boolean

  innerContainerStyle?: TextStyle

  textStyle?: ViewStyle

  inputStyle?: TextStyle

  TextInputComponent?: typeof RNTextInput
} & InternalProps
