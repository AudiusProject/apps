import { ChangeEvent } from 'react'

import { createEmailPageMessages } from '@audius/common/messages'
import { useDispatch } from 'react-redux'

import { setValueField } from 'common/store/pages/signon/actions'
import {
  HarmonyTextField,
  HarmonyTextFieldProps
} from 'components/form-fields/HarmonyTextField'

export const EmailField = (props: Partial<HarmonyTextFieldProps>) => {
  const dispatch = useDispatch()
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    dispatch(setValueField('email', e.target.value))
  }

  return (
    <HarmonyTextField
      name='email'
      autoComplete='email'
      label={createEmailPageMessages.emailLabel}
      autoFocus
      onChange={handleChange}
      {...props}
    />
  )
}
