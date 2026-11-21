import { useEffect } from 'react'

import { createEmailPageMessages } from '@audius/common/messages'
import { emailSchemaMessages } from '@audius/common/schemas'
import { setField } from 'common/store/pages/signon/actions'
import { useField, useFormikContext } from 'formik'
import { useDispatch } from 'react-redux'
import { usePrevious } from 'react-use'

import { Hint, IconError, TextLink } from '@audius/harmony-native'

import type { SignOnScreenType } from '../screens/types'

import { EmailField, type EmailFieldProps } from './EmailField'
import { GuestEmailHint } from './GuestEmailHint'

type NewEmailFieldProps = EmailFieldProps & {
  onChangeScreen: (screen: SignOnScreenType) => void
}

export const NewEmailField = (props: NewEmailFieldProps) => {
  const dispatch = useDispatch()
  const { onChangeScreen, ...other } = props
  const { name } = other

  const [, { error }] = useField(name)
  const { isValidating } = useFormikContext()
  const emailInUse = error === emailSchemaMessages.emailInUse
  const isGuest = error === emailSchemaMessages.guestAccountExists
  const hasError = emailInUse || isGuest

  const lastShownError = usePrevious(error)

  useEffect(() => {
    dispatch(setField('isGuest', isGuest))
  }, [dispatch, isGuest])

  const showGuestError =
    isGuest ||
    (isValidating && lastShownError === emailSchemaMessages.guestAccountExists)

  const showEmailInUseError =
    emailInUse ||
    (isValidating && lastShownError === emailSchemaMessages.emailInUse)

  return (
    <>
      <EmailField
        {...props}
        error={hasError ? false : undefined}
        helperText={hasError ? false : undefined}
      />
      {showGuestError ? (
        <GuestEmailHint />
      ) : showEmailInUseError ? (
        <Hint icon={IconError}>
          {error}{' '}
          <TextLink variant='visible' onPress={() => onChangeScreen('sign-in')}>
            {createEmailPageMessages.signIn}
          </TextLink>
        </Hint>
      ) : null}
    </>
  )
}
