import { TextArea, TextAreaProps } from '@audius/harmony'
import { useField } from 'formik'

type TextAreaFieldProps = TextAreaProps & {
  name: string
}

export const TextAreaField = (props: TextAreaFieldProps) => {
  const { name, ...other } = props
  const [{ value, ...field }, meta] = useField(name)

  const hasError = Boolean(meta.touched && meta.error)

  return (
    <TextArea
      value={value ?? ''}
      {...field}
      error={hasError}
      helperText={hasError ? meta.error : undefined}
      {...other}
    />
  )
}
