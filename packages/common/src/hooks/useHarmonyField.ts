import { useCallback, useState } from 'react'

import {
  FieldHelperProps,
  FieldHookConfig,
  FieldMetaProps,
  FieldInputProps as FormikFieldInputProps,
  useFormikContext,
  useField as useFormikField
} from 'formik'

import { useDebouncedCallback } from './useDebouncedCallback'

const getEventTargetValue = (
  e: React.ChangeEvent<any> | React.FocusEvent<any>
) => e.target?.value ?? e.currentTarget?.value ?? (e as any).nativeEvent?.text

export type UseHarmonyFieldProps<Value> = FieldHookConfig<Value> & {
  transformValueOnChange?: (value: string) => string
  transformValueOnBlur?: (value: string) => string
  debouncedIdleMs?: number
  showErrorBeforeSubmit?: boolean
  validateFieldOnChange?: boolean
}

export const useHarmonyField = <Value = any>(
  propsOrFieldName: string | UseHarmonyFieldProps<Value>
): [
  FormikFieldInputProps<Value>,
  FieldMetaProps<Value>,
  FieldHelperProps<Value>
] => {
  const props =
    typeof propsOrFieldName === 'string'
      ? { name: propsOrFieldName }
      : propsOrFieldName
  const {
    name,
    type = 'text',
    debouncedIdleMs = 0,
    transformValueOnChange,
    transformValueOnBlur,
    showErrorBeforeSubmit = false,
    validateFieldOnChange
  } = props
  const [field, meta, helpers] = useFormikField(props)
  const { onChange } = field
  const { touched, error } = meta
  const { setValue, setTouched } = helpers
  const {
    validateField,
    validateOnBlur,
    validateOnChange: validateFormOnChange,
    submitCount
  } = useFormikContext()

  const [isChanging, setIsChanging] = useState(false)

  const validateOnChange =
    validateFieldOnChange === undefined
      ? validateFormOnChange
      : validateFieldOnChange

  const hasError = Boolean(
    error &&
      touched &&
      (showErrorBeforeSubmit || submitCount > 0) &&
      !isChanging
  )

  const validateAndSetIdle = useCallback(() => {
    const maybePromise = setTouched(true) as Promise<void> | void
    if (maybePromise) {
      maybePromise.then(() => {
        setIsChanging(false)
      })
    } else {
      setIsChanging(false)
    }
  }, [setTouched, setIsChanging])

  const debouncedValidateAndSetIdle = useDebouncedCallback(
    validateAndSetIdle,
    [validateAndSetIdle],
    debouncedIdleMs
  )

  const onChangeText = useCallback(
    async (e: React.ChangeEvent<any>) => {
      setIsChanging(true)

      let value = getEventTargetValue(e)

      if (transformValueOnChange) {
        value = transformValueOnChange(value)
      }

      const maybePromise = setValue(value, false) as Promise<any> | void
      if (maybePromise) {
        await maybePromise
      }

      if (validateOnChange) {
        if (debouncedIdleMs) {
          debouncedValidateAndSetIdle()
        } else {
          validateField(name)
        }
      }
    },
    [
      transformValueOnChange,
      setValue,
      validateOnChange,
      debouncedIdleMs,
      debouncedValidateAndSetIdle,
      validateField,
      name
    ]
  )

  const onBlur = useCallback(
    (e: React.FocusEvent<any>) => {
      if (transformValueOnBlur) {
        let value = getEventTargetValue(e)
        value = transformValueOnBlur(e.target.value)
        setValue(value, false)
      }

      if (validateOnBlur) {
        validateAndSetIdle()
      } else {
        setTouched(true, false)
        setIsChanging(false)
      }
    },
    [
      setTouched,
      setValue,
      transformValueOnBlur,
      validateAndSetIdle,
      validateOnBlur
    ]
  )

  const onChangeOverride = useCallback(
    (e: React.ChangeEvent<any>) => {
      if (
        type === 'text' ||
        type === 'email' ||
        type === 'password' ||
        type === 'search' ||
        type === 'url'
      ) {
        onChangeText(e)
      } else {
        onChange(e)
      }
    },
    [onChangeText, onChange, type]
  )

  return [
    {
      ...field,
      onChange: onChangeOverride,
      onBlur
    },
    { ...meta, error: hasError ? error : undefined },
    helpers
  ]
}
