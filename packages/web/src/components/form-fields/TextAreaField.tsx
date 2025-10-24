import { useField } from 'formik'

import { TextAreaV2, TextAreaV2Props } from 'components/data-entry/TextAreaV2'

type TextAreaFieldProps = TextAreaV2Props & {
  name: string
}

export const TextAreaField = (props: TextAreaFieldProps) => {
  const { name, ...other } = props
  const [{ value, ...field }, meta] = useField(name)

  const hasError = Boolean(meta.touched && meta.error)

  return (
    <TextAreaV2
      value={value ?? ''}
      {...field}
      error={hasError}
      helperText={hasError ? meta.error : undefined}
      {...other}
    />
  )
}
