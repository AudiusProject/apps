import { useCallback, useEffect, useMemo, useState } from 'react'

import { useAudiusQueryContext } from '@audius/common/audius-query'
import { createEmailPageMessages } from '@audius/common/messages'
import { emailSchema } from '@audius/common/schemas'
import {
  Box,
  Button,
  Divider,
  Flex,
  IconArrowRight,
  IconAudiusLogoHorizontalColor,
  IconMetamask,
  Text,
  TextLink
} from '@audius/harmony'
import { Formik } from 'formik'
import { useDispatch, useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { useWindowSize } from 'react-use'
import { toFormikValidationSchema } from 'zod-formik-adapter'

import audiusLogoColored from 'assets/img/audiusLogoColored.png'
import {
  resetSignOn,
  setLinkedSocialOnFirstPage,
  setValueField,
  startSignUp
} from 'common/store/pages/signon/actions'
import {
  getEmailField,
  getLinkedSocialOnFirstPage
} from 'common/store/pages/signon/selectors'
import PreloadImage from 'components/preload-image/PreloadImage'
import { useMedia } from 'hooks/useMedia'
import { useNavigateToPage } from 'hooks/useNavigateToPage'
import { SocialMediaLoginOptions } from 'pages/sign-up-page/components/SocialMediaLoginOptions'
import {
  SIGN_IN_PAGE,
  SIGN_UP_CREATE_LOGIN_DETAILS,
  SIGN_UP_HANDLE_PAGE,
  SIGN_UP_PASSWORD_PAGE,
  SIGN_UP_REVIEW_HANDLE_PAGE
} from 'utils/route'

import ConnectedMetaMaskModal from '../components/ConnectedMetaMaskModal'
import { NewEmailField } from '../components/EmailField'
import { SocialMediaLoading } from '../components/SocialMediaLoading'
import { Heading, Page } from '../components/layout'
import { useSocialMediaLoader } from '../hooks/useSocialMediaLoader'
import { getWeb3Provider, web3authInstance } from '../../../services/web3-auth'

const smallDesktopWindowHeight = 900

export type SignUpEmailValues = {
  email: string
  withMetaMask?: boolean
  withWeb3Auth?: boolean
}

export const CreateEmailPage = () => {
  const { isMobile } = useMedia()
  const { height: windowHeight } = useWindowSize()
  const isSmallDesktop = windowHeight < smallDesktopWindowHeight
  const dispatch = useDispatch()
  const navigate = useNavigateToPage()
  const [isMetaMaskModalOpen, setIsMetaMaskModalOpen] = useState(false)
  const existingEmailValue = useSelector(getEmailField)
  const alreadyLinkedSocial = useSelector(getLinkedSocialOnFirstPage)
  const audiusQueryContext = useAudiusQueryContext()
  const EmailSchema = useMemo(
    () => toFormikValidationSchema(emailSchema(audiusQueryContext)),
    [audiusQueryContext]
  )

  const initialValues = {
    email: existingEmailValue.value ?? ''
  }

  const {
    isWaitingForSocialLogin,
    handleStartSocialMediaLogin,
    handleErrorSocialMediaLogin
  } = useSocialMediaLoader({
    resetAction: resetSignOn,
    linkedSocialOnThisPagePreviously: alreadyLinkedSocial,
    page: 'create-email'
  })

  const handleCompleteSocialMediaLogin = useCallback(
    (result: { requiresReview: boolean; handle: string }) => {
      const { handle, requiresReview } = result
      dispatch(startSignUp())
      dispatch(setLinkedSocialOnFirstPage(true))
      dispatch(setValueField('handle', handle))
      navigate(
        requiresReview
          ? SIGN_UP_REVIEW_HANDLE_PAGE
          : SIGN_UP_CREATE_LOGIN_DETAILS
      )
    },
    [dispatch, navigate]
  )

  useEffect(() => {
    const init = async () => {
      try {
        await web3authInstance.initModal();
        if (web3authInstance.connected) {
          // @ts-ignore
          window.web3auth = getWeb3Provider()
        }
      } catch (error) {
        console.error(error);
      }
    };

    init();
  }, [])

  const handleSubmit = useCallback(
    async (values: SignUpEmailValues) => {
      const { email, withMetaMask, withWeb3Auth } = values
      dispatch(setValueField('email', email))
      if (withMetaMask) {
        setIsMetaMaskModalOpen(true)
      } else if (withWeb3Auth) {
        await web3authInstance.connect()
        if (web3authInstance.connected) {
          // @ts-ignore
          window.web3auth = getWeb3Provider()
        }
      } else {
        navigate(SIGN_UP_PASSWORD_PAGE)
      }
    },
    [dispatch, navigate]
  )

  const signInLink = (
    <TextLink variant='visible' asChild>
      <Link to={SIGN_IN_PAGE}>{createEmailPageMessages.signIn}</Link>
    </TextLink>
  )

  return isWaitingForSocialLogin ? (
    <SocialMediaLoading />
  ) : (
    <Formik
      initialValues={initialValues}
      onSubmit={handleSubmit}
      validationSchema={EmailSchema}
      validateOnChange={false}
    >
      {({ isSubmitting, setFieldValue, submitForm }) => (
        <Page pt={isMobile ? 'xl' : 'unit13'}>
          <Box alignSelf={isSmallDesktop ? 'flex-start' : 'center'}>
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
            <Divider>
              <Text variant='body' size={isMobile ? 's' : 'm'} color='subdued'>
                {createEmailPageMessages.socialsDividerText}
              </Text>
            </Divider>
            <SocialMediaLoginOptions
              onError={handleErrorSocialMediaLogin}
              onStart={handleStartSocialMediaLogin}
              onCompleteSocialMediaLogin={handleCompleteSocialMediaLogin}
            />
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
          {!isMobile ? (
            <Flex direction='column' gap='s'>
              <Button
                variant='secondary'
                isStaticIcon
                fullWidth
                type='submit'
                onClick={() => {
                  setFieldValue('withWeb3Auth', true)
                  submitForm()
                }}
              >
                {createEmailPageMessages.signUpWeb3Auth}
              </Button>
            </Flex>
          ) : null}
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
              <ConnectedMetaMaskModal
                open={isMetaMaskModalOpen}
                onBack={() => setIsMetaMaskModalOpen(false)}
                onSuccess={() => navigate(SIGN_UP_HANDLE_PAGE)}
              />
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
