import { Select, SelectProps } from '@audius/harmony'
import { useField } from 'formik'
import { SetOptional } from 'type-fest'

export type SelectFieldProps = SetOptional<SelectProps<string>, 'value'> & {
  name: string
}

export const SelectField = (props: SelectFieldProps) => {
  const { name, menuProps, ...other } = props
  const [field, { touched, error }, { setValue }] = useField(name)

  const hasError = Boolean(touched && error)

  return (
    <Select
      {...field}
      error={hasError}
      helperText={hasError ? error : undefined}
      onChange={setValue}
      menuProps={{
        maxHeight: '250px',
        ...menuProps
      }}
      {...other}
    />
  )
}
