import { setValueField } from '@audius/web/src/common/store/pages/signon/actions'
import { useDispatch } from 'react-redux'

import type { TextInputChangeEvent } from '@audius/harmony-native'
import {
  HarmonyTextField,
  type HarmonyTextFieldProps
} from 'app/components/fields'

export type EmailFieldProps = HarmonyTextFieldProps

export const EmailField = (props: EmailFieldProps) => {
  const dispatch = useDispatch()

  const handleChange = (e: TextInputChangeEvent) => {
    dispatch(setValueField(props.name, e.nativeEvent.text))
    props.onChange?.(e)
  }

  return (
    <HarmonyTextField
      keyboardType='email-address'
      autoComplete='email'
      autoCorrect={false}
      autoCapitalize='none'
      {...props}
      onChange={handleChange}
    />
  )
}
