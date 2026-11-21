import { PasswordInput, PasswordInputProps } from '@audius/harmony'
import { useField } from 'formik'

type PasswordFieldProps = PasswordInputProps & {
  name: string
  clearErrorOnChange?: boolean
}

export const HarmonyPasswordField = (props: PasswordFieldProps) => {
  const { name, clearErrorOnChange = true, ...other } = props
  const [field, { touched, error }, { setError }] = useField(name)

  const hasError = Boolean(touched && error)

  return (
    <PasswordInput
      {...field}
      error={hasError}
      helperText={hasError ? error : undefined}
      onChange={(e) => {
        if (clearErrorOnChange) {
          setError(undefined)
        }
        field.onChange(e)
      }}
      {...other}
    />
  )
}
