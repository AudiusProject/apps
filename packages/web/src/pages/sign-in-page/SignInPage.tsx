import { useCallback, useEffect, useMemo, useState } from 'react'

import { useQueryContext } from '@audius/common/api'
import { signInPageMessages } from '@audius/common/messages'
import { signInSchema, signInErrorMessages } from '@audius/common/schemas'
import { route } from '@audius/common/utils'
import {
  Flex,
  IconAudiusLogoHorizontalColor,
  Button,
  IconArrowRight,
  TextLink,
  Box
} from '@audius/harmony'
import { useQueryClient } from '@tanstack/react-query'
import { Form, Formik, useField } from 'formik'
import { useDispatch } from 'react-redux'
import { Link } from 'react-router'
import { useWindowSize } from 'react-use'
import { toFormikValidationSchema } from 'zod-formik-adapter'

import audiusLogoColored from 'assets/img/audiusLogoColored.png'
import { setValueField, signIn } from 'common/store/pages/signon/actions'
import {
  getEmailField,
  getPasswordField,
  getRequiresOtp,
  getStatus
} from 'common/store/pages/signon/selectors'
import { HarmonyPasswordField } from 'components/form-fields/HarmonyPasswordField'
import PreloadImage from 'components/preload-image/PreloadImage'
import { useMedia } from 'hooks/useMedia'
import { useNavigateToPage } from 'hooks/useNavigateToPage'
import { GuestEmailHint } from 'pages/sign-on-page/GuestEmailHint'
import { EmailField } from 'pages/sign-up-page/components/EmailField'
import { ForgotPasswordModal } from 'pages/sign-up-page/components/ForgotPasswordModal'
import { Heading, ScrollView } from 'pages/sign-up-page/components/layout'
import { identify } from 'services/analytics'
import { useSelector } from 'utils/reducer'

import { SignInWithMetaMaskButton } from './SignInWithMetaMaskButton'

const { SIGN_IN_CONFIRM_EMAIL_PAGE, SIGN_UP_PAGE } = route

const smallDesktopWindowHeight = 900

type SignInValues = {
  email: string
  password: string
}

export const SignInPage = () => {
  const dispatch = useDispatch()
  const { isMobile } = useMedia()
  const { height: windowHeight } = useWindowSize()
  const isSmallDesktop = windowHeight < smallDesktopWindowHeight
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
      // This unsets the otp error so we can come back to this page
      // if necessary
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

  return (
    <>
      <Formik
        initialValues={initialValues}
        onSubmit={handleSubmit}
        validationSchema={SignInSchema}
        validateOnChange={false}
      >
        <ScrollView
          direction='column'
          justifyContent='space-between'
          ph={isMobile ? 'm' : '2xl'}
          pt='unit14'
          pb={isMobile ? '2xl' : 'unit14'}
          gap='l'
        >
          <Flex as={Form} direction='column' gap='2xl'>
            <Box alignSelf={isSmallDesktop ? 'flex-start' : 'center'}>
              {isMobile || isSmallDesktop ? (
                <IconAudiusLogoHorizontalColor />
              ) : (
                <PreloadImage
                  src={audiusLogoColored}
                  alt='Audius Logo'
                  css={{
                    height: 160,
                    width: 160,
                    objectFit: 'contain'
                  }}
                />
              )}
            </Box>
            <Heading
              heading={signInPageMessages.title}
              centered={isMobile}
              tag='h1'
            />
            <Flex direction='column' gap='l'>
              <EmailField />
              <SignInPasswordField />
              <GuestEmailHint />
            </Flex>
            <Flex direction='column' gap='l' w='100%'>
              <Button
                iconRight={IconArrowRight}
                type='submit'
                isLoading={signInStatus === 'loading'}
                fullWidth
              >
                {signInPageMessages.signIn}
              </Button>
              {!isMobile ? <SignInWithMetaMaskButton /> : null}
              <TextLink
                variant='visible'
                css={{ alignSelf: isMobile ? 'center' : undefined }}
                onClick={() => {
                  setShowForgotPassword(true)
                }}
              >
                {signInPageMessages.forgotPassword}
              </TextLink>
            </Flex>
          </Flex>
          {!isMobile ? (
            <Button
              variant='secondary'
              asChild
              fullWidth
              style={{ flexShrink: 0 }}
            >
              <Link to={SIGN_UP_PAGE}>{signInPageMessages.createAccount}</Link>
            </Button>
          ) : null}
        </ScrollView>
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
