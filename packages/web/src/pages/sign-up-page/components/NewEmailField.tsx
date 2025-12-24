import { useEffect } from 'react'

import { createEmailPageMessages } from '@audius/common/messages'
import { emailSchemaMessages } from '@audius/common/schemas'
import { route } from '@audius/common/utils'
import { Hint, IconError } from '@audius/harmony'
import { useField, useFormikContext } from 'formik'
import { useDispatch } from 'react-redux'
import { Link } from 'react-router'
import { usePrevious } from 'react-use'

import { setField } from 'common/store/pages/signon/actions'
import { TextLink } from 'components/link'

import { GuestEmailHint } from '../../sign-on-page/GuestEmailHint'

import { EmailField } from './EmailField'

const { SIGN_IN_PAGE } = route

type NewEmailFieldProps = {
  isGuestCheckout?: boolean
}

export const NewEmailField = (props: NewEmailFieldProps) => {
  const { isGuestCheckout } = props
  const dispatch = useDispatch()
  const emailFieldName = isGuestCheckout ? 'guestEmail' : 'email'
  const [, { error }] = useField(emailFieldName)
  const { isValidating } = useFormikContext()
  const emailInUse = error === emailSchemaMessages.emailInUse
  const isGuest = error === emailSchemaMessages.guestAccountExists
  const hasError = emailInUse || isGuest

  // Track which specific error was shown last
  const lastShownError = usePrevious(error)

  useEffect(() => {
    dispatch(setField('isGuest', isGuest))
  }, [dispatch, isGuest])

  const signInLink = (
    <TextLink variant='visible' asChild>
      <Link to={SIGN_IN_PAGE}>{createEmailPageMessages.signIn}</Link>
    </TextLink>
  )

  const showGuestError =
    isGuest ||
    (isValidating && lastShownError === emailSchemaMessages.guestAccountExists)
  const showEmailInUseError =
    emailInUse ||
    (isValidating && lastShownError === emailSchemaMessages.emailInUse)

  return (
    <>
      <EmailField
        name={emailFieldName}
        helperText={hasError ? '' : undefined}
      />
      {showGuestError ? (
        <GuestEmailHint isGuestCheckout={isGuestCheckout} />
      ) : showEmailInUseError ? (
        <Hint icon={IconError}>
          {error} {signInLink}
        </Hint>
      ) : null}
    </>
  )
}
