import { useCallback, useMemo } from 'react'

import { useQueryContext } from '@audius/common/api'
import { createEmailPageMessages } from '@audius/common/messages'
import { emailSchema } from '@audius/common/schemas'
import { route } from '@audius/common/utils'
import {
  Button,
  Flex,
  IconAudiusLogoHorizontal,
  IconArrowRight,
  Text,
  TextLink
} from '@audius/harmony'
import { useQueryClient } from '@tanstack/react-query'
import { Form, Formik } from 'formik'
import { useDispatch, useSelector } from 'react-redux'
import { Link } from 'react-router'
import { toFormikValidationSchema } from 'zod-formik-adapter'

import { setValueField, startSignUp } from 'common/store/pages/signon/actions'
import { getEmailField } from 'common/store/pages/signon/selectors'
import { useMedia } from 'hooks/useMedia'
import { useNavigateToPage } from 'hooks/useNavigateToPage'
import { identify } from 'services/analytics'

import { NewEmailField } from '../components/NewEmailField'
import { Heading } from '../components/layout'

const { SIGN_IN_PAGE, SIGN_UP_PASSWORD_PAGE } = route

const messages = {
  ...createEmailPageMessages,
  title: 'Sign Up',
  mobileTitle: 'Sign Up For Audius',
  alreadyHaveAccount: 'Already have an account?',
  logIn: 'Log In',
  mobileLogIn: 'Sign In',
  continueButton: 'Continue',
  mobileSignUpButton: 'Sign Up Free'
}

type SignUpEmailValues = {
  email: string
}

export const CreateEmailPage = () => {
  const { isMobile } = useMedia()
  const dispatch = useDispatch()
  const navigate = useNavigateToPage()
  const existingEmailValue = useSelector(getEmailField)
  const queryContext = useQueryContext()
  const queryClient = useQueryClient()

  const EmailSchema = useMemo(
    () => toFormikValidationSchema(emailSchema(queryContext, queryClient)),
    [queryContext, queryClient]
  )

  const initialValues = {
    email: existingEmailValue.value ?? ''
  }

  const handleSubmit = useCallback(
    async (values: SignUpEmailValues) => {
      const { email } = values
      dispatch(startSignUp())
      dispatch(setValueField('email', email))
      identify({ email })
      navigate(SIGN_UP_PASSWORD_PAGE)
    },
    [dispatch, navigate]
  )

  const logoHeight = isMobile ? 48 : 56
  const logoWidth = isMobile ? 236 : 275

  return (
    <Formik
      initialValues={initialValues}
      onSubmit={handleSubmit}
      validationSchema={EmailSchema}
      validateOnMount={!!existingEmailValue}
      validateOnChange={false}
    >
      {({ isSubmitting }) =>
        isMobile ? (
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
            <Heading heading={messages.mobileTitle} tag='h1' centered />
            <Flex direction='column' gap='l' w='100%'>
              <NewEmailField />
            </Flex>
            <Flex direction='column' gap='l' w='100%' alignItems='center'>
              <Button
                variant='primary'
                type='submit'
                iconRight={IconArrowRight}
                fullWidth
                isLoading={isSubmitting}
              >
                {messages.mobileSignUpButton}
              </Button>
              <Text variant='body' size='m' color='subdued'>
                {messages.alreadyHaveAccount}{' '}
                <TextLink variant='visible' asChild>
                  <Link to={SIGN_IN_PAGE}>{messages.mobileLogIn}</Link>
                </TextLink>
              </Text>
            </Flex>
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
            <Heading heading={messages.title} tag='h1' centered />
            <Flex direction='column' gap='l' w='100%'>
              <NewEmailField />
            </Flex>
            <Flex direction='column' gap='l' w='100%' alignItems='center'>
              <Text variant='body' size='l' color='subdued'>
                {messages.alreadyHaveAccount}{' '}
                <TextLink variant='visible' asChild>
                  <Link to={SIGN_IN_PAGE}>{messages.logIn}</Link>
                </TextLink>
              </Text>
              <Button
                variant='primary'
                type='submit'
                fullWidth
                isLoading={isSubmitting}
              >
                {messages.continueButton}
              </Button>
            </Flex>
          </Flex>
        )
      }
    </Formik>
  )
}
