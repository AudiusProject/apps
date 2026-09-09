import type { Ref } from 'react'
import { forwardRef, useEffect } from 'react'

import { useDebouncedCallback } from '@audius/common/hooks'
import { useField, useFormikContext } from 'formik'

import { TextInput } from '@audius/harmony-native'
import type { TextInputRef, TextInputProps } from '@audius/harmony-native'

export type HarmonyTextFieldProps = TextInputProps & {
  name: string
  /**
   * Clears out field errors while the input is being changed for a small UX improvement
   * @default true
   */
  clearErrorOnChange?: boolean
  /** Function to transform the input value upon `onChange`.
   * E.g. a function to trim whitespace */
  transformValueOnChange?: (value: string) => string
  transformValueOnBlur?: (value: string) => string
  debouncedValidationMs?: number
}

export const HarmonyTextField = forwardRef(
  (props: HarmonyTextFieldProps, ref: Ref<TextInputRef>) => {
    const {
      name,
      clearErrorOnChange = true,
      transformValueOnChange,
      transformValueOnBlur,
      debouncedValidationMs = 0,
      helperText,
      onChange: onChangeProp,
      error: errorProp,
      ...other
    } = props
    const [field, { touched, error: errorField }, { setError }] = useField(name)
    const { value } = field
    const { validateField } = useFormikContext()
    const error = errorProp ?? errorField

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

    const hasError = Boolean(touched && error)

    return (
      <TextInput
        {...field}
        ref={ref}
        error={hasError}
        helperText={helperText ?? (hasError ? error : undefined)}
        onChange={(e) => {
          onChangeProp?.(e)
          if (clearErrorOnChange) {
            setError(undefined)
          }
          if (transformValueOnChange) {
            e.nativeEvent.text = transformValueOnChange(e.nativeEvent.text)
          }
          field.onChange(name)(e.nativeEvent.text)
        }}
        onBlur={(e) => {
          if (transformValueOnBlur) {
            // RN 0.81 dropped `text` from the blur event's type, but the
            // native event still carries it at runtime.
            const nativeEvent = e.nativeEvent as typeof e.nativeEvent & {
              text: string
            }
            nativeEvent.text = transformValueOnBlur(nativeEvent.text)
          }
          field.onBlur(name)(e)
        }}
        {...other}
      />
    )
  }
)
