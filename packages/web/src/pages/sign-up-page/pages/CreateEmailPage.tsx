import { useCallback, useMemo } from 'react'

import { useQueryContext } from '@audius/common/api'
import { createEmailPageMessages } from '@audius/common/messages'
import { emailSchema } from '@audius/common/schemas'
import { useExternalWalletSignUpModal } from '@audius/common/store'
import { route } from '@audius/common/utils'
import {
  Box,
  Button,
  Flex,
  IconArrowRight,
  IconAudiusLogoHorizontalColor,
  IconMetamask,
  Text,
  TextLink
} from '@audius/harmony'
import { useQueryClient } from '@tanstack/react-query'
import { Form, Formik } from 'formik'
import { useDispatch, useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { useWindowSize } from 'react-use'
import { toFormikValidationSchema } from 'zod-formik-adapter'

import audiusLogoColored from 'assets/img/audiusLogoColored.png'
import { setValueField, startSignUp } from 'common/store/pages/signon/actions'
import { getEmailField } from 'common/store/pages/signon/selectors'
import PreloadImage from 'components/preload-image/PreloadImage'
import { useMedia } from 'hooks/useMedia'
import { useNavigateToPage } from 'hooks/useNavigateToPage'
import { identify } from 'services/analytics'

import { ExternalWalletSignUpModal } from '../components/ExternalWalletSignUpModal'
import { NewEmailField } from '../components/NewEmailField'
import { Heading, Page } from '../components/layout'

const { SIGN_IN_PAGE, SIGN_UP_PASSWORD_PAGE } = route

const smallDesktopWindowHeight = 900

type SignUpEmailValues = {
  email: string
  withMetaMask?: boolean
}

export const CreateEmailPage = () => {
  const { isMobile } = useMedia()
  const { height: windowHeight } = useWindowSize()
  const isSmallDesktop = windowHeight < smallDesktopWindowHeight
  const dispatch = useDispatch()
  const navigate = useNavigateToPage()
  const { onOpen: openExternalWalletSignUpModal } =
    useExternalWalletSignUpModal()
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
      const { email, withMetaMask } = values
      dispatch(startSignUp())
      dispatch(setValueField('email', email))
      identify({
        email
      })
      if (withMetaMask) {
        openExternalWalletSignUpModal()
      } else {
        navigate(SIGN_UP_PASSWORD_PAGE)
      }
    },
    [dispatch, navigate, openExternalWalletSignUpModal]
  )

  const signInLink = (
    <TextLink variant='visible' asChild>
      <Link to={SIGN_IN_PAGE}>{createEmailPageMessages.signIn}</Link>
    </TextLink>
  )

  return (
    <Formik
      initialValues={initialValues}
      onSubmit={handleSubmit}
      validationSchema={EmailSchema}
      validateOnMount={!!existingEmailValue}
      validateOnChange={false}
    >
      {({ isSubmitting, setFieldValue, submitForm }) => (
        <Page as={Form} pt={isMobile ? 'xl' : 'unit13'}>
          <Box alignSelf='center'>
            {isMobile || isSmallDesktop ? (
              <IconAudiusLogoHorizontalColor />
            ) : (
              <PreloadImage
                src={audiusLogoColored}
                alt='Audius Colored Logo'
                css={{
                  height: 160,
                  width: 160,
                  objectFit: 'contain'
                }}
              />
            )}
          </Box>
          <Heading
            heading={createEmailPageMessages.title}
            tag='h1'
            centered={isMobile}
          />
          <Flex direction='column' gap='l'>
            <NewEmailField />
          </Flex>
          <Flex direction='column' gap='l'>
            <Button
              variant='primary'
              type='submit'
              fullWidth
              iconRight={IconArrowRight}
              isLoading={isSubmitting}
              onClick={() => {
                setFieldValue('withMetaMask', false)
                submitForm()
              }}
            >
              {createEmailPageMessages.signUp}
            </Button>

            <Text
              variant='body'
              size={isMobile ? 'm' : 'l'}
              textAlign={isMobile ? 'center' : undefined}
            >
              {createEmailPageMessages.haveAccount} {signInLink}
            </Text>
          </Flex>
          {!isMobile && window.ethereum ? (
            <Flex direction='column' gap='s'>
              <Button
                variant='secondary'
                iconRight={IconMetamask}
                isStaticIcon
                fullWidth
                type='submit'
                onClick={() => {
                  setFieldValue('withMetaMask', true)
                  submitForm()
                }}
              >
                {createEmailPageMessages.signUpMetamask}
              </Button>
              <ExternalWalletSignUpModal />
              <Text size='s' variant='body'>
                {createEmailPageMessages.metaMaskNotRecommended}{' '}
                <TextLink variant='visible'>
                  {createEmailPageMessages.learnMore}
                </TextLink>
              </Text>
            </Flex>
          ) : null}
        </Page>
      )}
    </Formik>
  )
}
