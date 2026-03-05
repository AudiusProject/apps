import { useCallback, useEffect, useMemo, useState } from 'react'

import { useQueryContext } from '@audius/common/api'
import { signInPageMessages } from '@audius/common/messages'
import { signInSchema, signInErrorMessages } from '@audius/common/schemas'
import { route } from '@audius/common/utils'
import {
  Flex,
  IconAudiusLogoHorizontal,
  IconArrowRight,
  Button,
  TextLink,
  Text
} from '@audius/harmony'
import { useQueryClient } from '@tanstack/react-query'
import { Form, Formik, useField } from 'formik'
import { useDispatch } from 'react-redux'
import { Link } from 'react-router'
import { toFormikValidationSchema } from 'zod-formik-adapter'

import { setValueField, signIn } from 'common/store/pages/signon/actions'
import {
  getEmailField,
  getPasswordField,
  getRequiresOtp,
  getStatus
} from 'common/store/pages/signon/selectors'
import { HarmonyPasswordField } from 'components/form-fields/HarmonyPasswordField'
import { useMedia } from 'hooks/useMedia'
import { useNavigateToPage } from 'hooks/useNavigateToPage'
import { GuestEmailHint } from 'pages/sign-on-page/GuestEmailHint'
import { EmailField } from 'pages/sign-up-page/components/EmailField'
import { ForgotPasswordModal } from 'pages/sign-up-page/components/ForgotPasswordModal'
import { Heading } from 'pages/sign-up-page/components/layout'
import { identify } from 'services/analytics'
import { useSelector } from 'utils/reducer'

const { SIGN_IN_CONFIRM_EMAIL_PAGE, SIGN_UP_PAGE } = route

const messages = {
  ...signInPageMessages,
  title: 'Welcome Back',
  mobileTitle: 'Sign Into Audius',
  newToAudius: 'New to Audius?',
  createAnAccount: 'Create an Account',
  logIn: 'Log In',
  mobileLogIn: 'Sign In'
}

type SignInValues = {
  email: string
  password: string
}

export const SignInPage = () => {
  const dispatch = useDispatch()
  const { isMobile } = useMedia()
  const navigate = useNavigateToPage()
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const { value: existingEmail } = useSelector(getEmailField)
  const { value: existingPassword } = useSelector(getPasswordField)
  const requiresOtp = useSelector(getRequiresOtp)

  const queryContext = useQueryContext()
  const queryClient = useQueryClient()
  const SignInSchema = useMemo(
    () => toFormikValidationSchema(signInSchema(queryContext, queryClient)),
    [queryContext, queryClient]
  )

  useEffect(() => {
    if (requiresOtp) {
      navigate(SIGN_IN_CONFIRM_EMAIL_PAGE)
      dispatch(setValueField('password', existingPassword))
    }
  }, [navigate, requiresOtp, existingPassword, dispatch])

  const initialValues = {
    email: existingEmail ?? '',
    password: existingPassword ?? ''
  }

  const signInStatus = useSelector(getStatus)

  const handleSubmit = useCallback(
    (values: SignInValues) => {
      const { email, password } = values
      dispatch(setValueField('email', email))
      dispatch(setValueField('password', password))
      dispatch(signIn(email, password))
      identify({ email })
    },
    [dispatch]
  )

  const logoHeight = isMobile ? 48 : 56
  const logoWidth = isMobile ? 236 : 275

  return (
    <>
      <Formik
        initialValues={initialValues}
        onSubmit={handleSubmit}
        validationSchema={SignInSchema}
        validateOnChange={false}
      >
        {isMobile ? (
          <Flex
            as={Form}
            direction='column'
            alignItems='center'
            w='100%'
            css={{ gap: 48, padding: '80px 24px' }}
          >
            <IconAudiusLogoHorizontal
              height={logoHeight}
              width={logoWidth}
              color='default'
            />
            <Heading heading={messages.mobileTitle} centered tag='h1' />
            <Flex direction='column' gap='l' w='100%'>
              <EmailField />
              <SignInPasswordField />
              <GuestEmailHint />
            </Flex>
            <Flex direction='column' gap='l' w='100%' alignItems='center'>
              <Button
                type='submit'
                iconRight={IconArrowRight}
                isLoading={signInStatus === 'loading'}
                fullWidth
              >
                {messages.mobileLogIn}
              </Button>
              <TextLink
                variant='visible'
                onClick={() => setShowForgotPassword(true)}
              >
                {messages.forgotPassword}
              </TextLink>
            </Flex>
            <Flex flex={1} />
            <Text variant='body' size='m' color='subdued'>
              {messages.newToAudius}{' '}
              <TextLink variant='visible' asChild>
                <Link to={SIGN_UP_PAGE}>{messages.createAnAccount}</Link>
              </TextLink>
            </Text>
          </Flex>
        ) : (
          <Flex
            as={Form}
            direction='column'
            gap='2xl'
            alignItems='center'
            p='2xl'
          >
            <IconAudiusLogoHorizontal
              height={logoHeight}
              width={logoWidth}
              color='default'
            />
            <Heading heading={messages.title} centered tag='h1' />
            <Flex direction='column' gap='l' w='100%'>
              <EmailField />
              <SignInPasswordField />
              <TextLink
                variant='visible'
                onClick={() => setShowForgotPassword(true)}
              >
                {messages.forgotPassword}
              </TextLink>
              <GuestEmailHint />
            </Flex>
            <Flex direction='column' gap='l' w='100%' alignItems='center'>
              <Text variant='body' size='l' color='subdued'>
                {messages.newToAudius}{' '}
                <TextLink variant='visible' asChild>
                  <Link to={SIGN_UP_PAGE}>{messages.createAnAccount}</Link>
                </TextLink>
              </Text>
              <Button
                type='submit'
                isLoading={signInStatus === 'loading'}
                fullWidth
              >
                {messages.logIn}
              </Button>
            </Flex>
          </Flex>
        )}
      </Formik>
      <ForgotPasswordModal
        isOpen={showForgotPassword}
        onClose={() => setShowForgotPassword(false)}
      />
    </>
  )
}

const SignInPasswordField = () => {
  const signInError = useSelector((state) =>
    getPasswordField(state)?.error.includes('400')
  )
  const [, , { setError }] = useField('password')

  useEffect(() => {
    if (signInError) {
      setError(signInErrorMessages.invalidCredentials)
    }
  }, [setError, signInError])

  return (
    <HarmonyPasswordField
      name='password'
      label={signInPageMessages.passwordLabel}
    />
  )
}
