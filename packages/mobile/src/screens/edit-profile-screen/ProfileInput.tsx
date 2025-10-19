import type { ComponentType } from 'react'

import { useField } from 'formik'
import type { TextInputProps as RNTextInputProps } from 'react-native'
import type { SvgProps } from 'react-native-svg'

import { TextInput, type TextInputProps } from '@audius/harmony-native'

type ProfileInputProps = Omit<
  TextInputProps,
  'value' | 'onChange' | 'onBlur'
> & {
  name: string
  label: string
  Icon?: ComponentType<SvgProps>
  maxLength?: number
  multiline?: boolean
  editable?: boolean
  startAdornmentText?: string
} & Pick<RNTextInputProps, 'placeholder'>

export const ProfileInput = ({
  name,
  label,
  Icon,
  maxLength,
  multiline,
  editable,
  startAdornmentText,
  placeholder,
  ...other
}: ProfileInputProps) => {
  const [{ value }, , { setValue }] = useField<string | null>(name)

  return (
    <TextInput
      label={label}
      value={value ?? ''}
      onChange={(e) => setValue(e.nativeEvent.text)}
      maxLength={maxLength}
      multiline={multiline}
      editable={editable}
      startAdornmentText={startAdornmentText}
      startIcon={Icon}
      placeholder={placeholder}
      size={multiline ? 'default' : 'default'}
      hideLabel={!multiline}
      {...other}
    />
  )
}
