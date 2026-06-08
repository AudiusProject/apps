import { useCallback, useEffect, useMemo } from 'react'

import { useQueryContext } from '@audius/common/api'
import { signInPageMessages } from '@audius/common/messages'
import {
  signInSchema,
  signInErrorMessages,
  emailSchemaMessages
} from '@audius/common/schemas'
import {
  getEmailField,
  getPasswordField,
  getRequiresOtp,
  getStatus
} from '@audius/web/src/common/store/pages/signon/selectors'
import { useQueryClient } from '@tanstack/react-query'
import { setValueField, signIn } from 'common/store/pages/signon/actions'
import { Formik, useField } from 'formik'
import { useDispatch, useSelector } from 'react-redux'
import { toFormikValidationSchema } from 'zod-formik-adapter'

import { Button, Flex, IconArrowRight, TextLink } from '@audius/harmony-native'
import { PasswordField } from 'app/components/fields'
import { useDrawer } from 'app/hooks/useDrawer'
import { useNavigation } from 'app/hooks/useNavigation'

import { EmailField } from '../components/EmailField'
import { GuestEmailHint } from '../components/GuestEmailHint'
import { Heading } from '../components/layout'
import type { SignOnScreenParamList } from '../types'
import { useTrackScreen } from '../utils/useTrackScreen'

type SignInValues = {
  email: string
  password: string
}

export const SignInScreen = () => {
  const dispatch = useDispatch()
  const { value: existingEmail } = useSelector(getEmailField)
  const { value: existingPassword } = useSelector(getPasswordField)
  const signInStatus = useSelector(getStatus)
  const { onOpen } = useDrawer('ForgotPassword')
  const requiresOtp = useSelector(getRequiresOtp)
  const navigation = useNavigation<SignOnScreenParamList>()
  const queryClient = useQueryClient()
  useTrackScreen('SignIn')

  const queryContext = useQueryContext()
  const SignInSchema = useMemo(
    () => toFormikValidationSchema(signInSchema(queryContext, queryClient)),
    [queryContext, queryClient]
  )

  useEffect(() => {
    if (requiresOtp) {
      navigation.navigate('ConfirmEmail')
      // This unsets the otp error so we can come back to this page
      // if necessary
      dispatch(setValueField('password', existingPassword))
    }
  }, [dispatch, existingPassword, navigation, requiresOtp])

  const initialValues = {
    email: existingEmail ?? '',
    password: existingPassword ?? ''
  }

  const handleSubmit = useCallback(
    async (values: SignInValues) => {
      const { email, password } = values
      dispatch(setValueField('email', email))
      dispatch(setValueField('password', password))
      dispatch(signIn(email, password))
    },
    [dispatch]
  )

  return (
    <Formik
      initialValues={initialValues}
      validationSchema={SignInSchema}
      validateOnChange={false}
      onSubmit={handleSubmit}
    >
      {({ handleSubmit, errors }) => {
        const hideEmailError =
          errors.email === emailSchemaMessages.guestAccountExists
        return (
          <>
            <Heading heading={signInPageMessages.title} centered />
            <Flex gap='l'>
              <EmailField
                name='email'
                label={signInPageMessages.emailLabel}
                error={hideEmailError ? false : undefined}
                helperText={hideEmailError ? false : undefined}
              />
              <SignInPasswordField />
              <GuestEmailHint />
            </Flex>
            <Flex gap='l'>
              <Button
                size='default'
                fullWidth
                iconRight={IconArrowRight}
                isLoading={signInStatus === 'loading'}
                onPress={async () => await handleSubmit()}
              >
                {signInPageMessages.signIn}
              </Button>
              <TextLink variant='visible' textAlign='center' onPress={onOpen}>
                {signInPageMessages.forgotPassword}
              </TextLink>
            </Flex>
          </>
        )
      }}
    </Formik>
  )
}

const SignInPasswordField = () => {
  const signInError = useSelector((state: any) =>
    getPasswordField(state)?.error.includes('400')
  )
  const [, { error }, { setError }] = useField('password')

  useEffect(() => {
    if (signInError) {
      setError(signInErrorMessages.invalidCredentials)
    }
  }, [setError, signInError])

  return (
    <PasswordField
      name='password'
      label={signInPageMessages.passwordLabel}
      autoComplete='current-password'
      helperText={error}
    />
  )
}
