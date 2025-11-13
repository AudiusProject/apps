import { Ref, forwardRef } from 'react'

import { useIsWaitingForValidation } from '@audius/common/hooks'
import { pickHandlePageMessages as messages } from '@audius/common/messages'
import { MAX_HANDLE_LENGTH } from '@audius/common/services'
import { IconCheck } from '@audius/harmony'
import { useField } from 'formik'

import {
  HarmonyTextField,
  HarmonyTextFieldProps
} from 'components/form-fields/HarmonyTextField'

const helperTextForHandle = (
  handle: string,

  error: string | undefined,
  isWaitingForValidation: boolean
) => {
  if (!handle) return null
  if (error) return error
  if (!isWaitingForValidation) return messages.handleAvailable
  return null
}

const formatHandleValue = (value: string) => value.replace(/\s/g, '')

type HandleFieldProps = Partial<HarmonyTextFieldProps>

export const HandleField = forwardRef(
  (props: HandleFieldProps, ref: Ref<HTMLInputElement>) => {
    const { onChange, ...other } = props

    const [{ value: handle }, { error }] = useField('handle')

    const { isWaitingForValidation, handleChange } = useIsWaitingForValidation()

    const helperText = helperTextForHandle(
      handle,
      error,
      isWaitingForValidation
    )

    return (
      <HarmonyTextField
        ref={ref}
        name='handle'
        label={messages.handle}
        helperText={helperText}
        maxLength={MAX_HANDLE_LENGTH}
        startAdornmentText='@'
        placeholder={messages.handle}
        transformValueOnChange={formatHandleValue}
        debouncedValidationMs={1000}
        endIcon={
          !isWaitingForValidation && !error && handle ? IconCheck : undefined
        }
        IconProps={{ size: 'l', color: 'default' }}
        error={!!error}
        onChange={(e) => {
          onChange?.(e)
          handleChange()
        }}
        {...other}
      />
    )
  }
)
