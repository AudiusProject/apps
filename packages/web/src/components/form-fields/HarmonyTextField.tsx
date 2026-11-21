import { Ref, forwardRef, useEffect } from 'react'

import { useDebouncedCallback } from '@audius/common/hooks'
import { TextInput, TextInputProps } from '@audius/harmony'
import { useField, useFormikContext } from 'formik'

export type HarmonyTextFieldProps = TextInputProps & {
  name: string
  clearErrorOnChange?: boolean
  transformValueOnChange?: (value: string) => string
  transformValueOnBlur?: (value: string) => string
  debouncedValidationMs?: number
}

export const HarmonyTextField = forwardRef(
  (props: HarmonyTextFieldProps, ref: Ref<HTMLInputElement>) => {
    const {
      name,
      clearErrorOnChange = true,
      transformValueOnChange,
      transformValueOnBlur,
      debouncedValidationMs = 0,
      helperText,
      onChange: onChangeProp,
      onBlur: onBlurProp,
      ...other
    } = props
    const [field, { touched, error }, { setError }] = useField(name)
    const { value } = field
    const { validateField, submitCount } = useFormikContext()

    const debouncedValidateField = useDebouncedCallback(
      (field: string) => validateField(field),
      [validateField],
      debouncedValidationMs
    )

    useEffect(() => {
      if (debouncedValidationMs) {
        debouncedValidateField(name)
      }
    }, [debouncedValidationMs, debouncedValidateField, name, value])

    const hasError = Boolean(touched && error && submitCount > 0)

    return (
      <TextInput
        ref={ref}
        {...field}
        value={value ?? ''}
        error={hasError}
        helperText={helperText ?? (hasError ? error : undefined)}
        onChange={(e) => {
          if (clearErrorOnChange) {
            setError(undefined)
          }
          if (transformValueOnChange) {
            e.target.value = transformValueOnChange(e.target.value)
          }
          onChangeProp?.(e)
          field.onChange(e)
        }}
        onBlur={(e) => {
          if (transformValueOnBlur) {
            e.target.value = transformValueOnBlur(e.target.value)
          }
          field.onChange(e)
          onBlurProp?.(e)
          field.onBlur(e)
        }}
        {...other}
      />
    )
  }
)
