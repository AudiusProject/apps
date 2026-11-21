import { useField } from 'formik'

import type { PasswordInputProps } from '@audius/harmony-native'
import { PasswordInput } from '@audius/harmony-native'

export type PasswordFieldProps = PasswordInputProps & {
  name: string
  clearErrorOnChange?: boolean
}

export const PasswordField = (props: PasswordFieldProps) => {
  const { name, clearErrorOnChange = true, ...other } = props
  const [field, { touched, error }, { setError }] = useField(name)

  const hasError = Boolean(touched && error)

  return (
    <PasswordInput
      {...field}
      error={hasError}
      onChange={(e) => {
        if (clearErrorOnChange) {
          setError(undefined)
        }
        field.onChange(name)(e.nativeEvent.text)
      }}
      onBlur={field.onBlur(name)}
      {...other}
    />
  )
}
