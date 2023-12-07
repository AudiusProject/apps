import { useCallback, useContext, useEffect, useMemo, useState } from 'react'

import { socialMediaMessages, useAudiusQueryContext } from '@audius/common'
import { Divider, Flex, IconVerified, Paper, Text } from '@audius/harmony'
import { Form, Formik } from 'formik'
import { useDispatch, useSelector } from 'react-redux'
import { toFormikValidationSchema } from 'zod-formik-adapter'

import {
  setValueField,
  unsetSocialProfile
} from 'common/store/pages/signon/actions'
import {
  getHandleField,
  getIsSocialConnected,
  getLinkedSocialOnFirstPage
} from 'common/store/pages/signon/selectors'
import { ToastContext } from 'components/toast/ToastContext'
import { useMedia } from 'hooks/useMedia'
import { useNavigateToPage } from 'hooks/useNavigateToPage'
import {
  SIGN_UP_CREATE_LOGIN_DETAILS,
  SIGN_UP_FINISH_PROFILE_PAGE,
  SIGN_UP_REVIEW_HANDLE_PAGE
} from 'utils/route'

import { HandleField } from '../components/HandleField'
import { OutOfText } from '../components/OutOfText'
import { SocialMediaLoading } from '../components/SocialMediaLoading'
import { SocialMediaLoginOptions } from '../components/SocialMediaLoginOptions'
import { Heading, Page, PageFooter } from '../components/layout'
import { generateHandleSchema } from '../utils/handleSchema'

const messages = {
  title: 'Pick Your Handle',
  description:
    'This is how others find and tag you. It is totally unique to you & cannot be changed later.',
  handle: 'Handle',
  or: 'or',
  claimHandleHeaderPrefix: 'Claim Your Verified',
  claimHandleDescription:
    'Verify your Audius account by linking a verified social media account.',
  claimHandleHeadsUp:
    'Heads up! 👋 Picking a handle that doesn’t match your verified account cannot be undone later.'
}

type PickHandleValues = {
  handle: string
}

type SocialMediaSectionProps = {
  onCompleteSocialMediaLogin: (info: {
    requiresReview: boolean
    handle: string
    platform: 'twitter' | 'instagram' | 'tiktok'
  }) => void
  onStart: () => void
  onError: () => void
}

const SocialMediaSection = ({
  onCompleteSocialMediaLogin,
  onStart,
  onError
}: SocialMediaSectionProps) => {
  const { isMobile } = useMedia()

  return (
    <Paper direction='column' backgroundColor='surface2' p='l' gap='l'>
      <Flex direction='column' gap='s'>
        <Text
          variant={isMobile ? 'title' : 'heading'}
          size={isMobile ? 'm' : 's'}
        >
          {messages.claimHandleHeaderPrefix}{' '}
          <Text color='accent' tag='span'>
            @{messages.handle}
          </Text>{' '}
          <IconVerified
            size={isMobile ? 's' : 'm'}
            css={{ verticalAlign: 'sub' }}
          />
        </Text>
        <Text variant='body' size={isMobile ? 'm' : 'l'}>
          {messages.claimHandleDescription}
        </Text>
      </Flex>
      <SocialMediaLoginOptions
        onStart={onStart}
        onError={onError}
        onCompleteSocialMediaLogin={onCompleteSocialMediaLogin}
      />
      <Text variant='body' size={isMobile ? 'm' : 'l'}>
        {messages.claimHandleHeadsUp}
      </Text>
    </Paper>
  )
}

export const PickHandlePage = () => {
  const { isMobile } = useMedia()

  const dispatch = useDispatch()
  useEffect(() => {
    // If the user goes back to this page in the middle of the flow after they linked
    // their social on this page previously, clear the social media state.
    if (alreadyLinkedSocial) {
      dispatch(unsetSocialProfile())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch])
  const navigate = useNavigateToPage()
  const { toast } = useContext(ToastContext)
  const audiusQueryContext = useAudiusQueryContext()
  const validationSchema = useMemo(() => {
    return toFormikValidationSchema(
      generateHandleSchema({ audiusQueryContext })
    )
  }, [audiusQueryContext])
  const [isWaitingForSocialLogin, setIsWaitingForSocialLogin] = useState(false)
  const alreadyLinkedSocial = useSelector(getIsSocialConnected)

  const { value: handle } = useSelector(getHandleField)
  const isLinkingSocialOnFirstPage = useSelector(getLinkedSocialOnFirstPage)

  const handleStartSocialMediaLogin = useCallback(() => {
    setIsWaitingForSocialLogin(true)
  }, [])

  const handleErrorSocialMediaLogin = useCallback(() => {
    setIsWaitingForSocialLogin(false)
  }, [])

  const handleSubmit = useCallback(
    (values: PickHandleValues) => {
      const { handle } = values
      dispatch(setValueField('handle', handle))
      navigate(
        isLinkingSocialOnFirstPage
          ? SIGN_UP_CREATE_LOGIN_DETAILS
          : SIGN_UP_FINISH_PROFILE_PAGE
      )
    },
    [dispatch, navigate, isLinkingSocialOnFirstPage]
  )

  const handleCompleteSocialMediaLogin = useCallback(
    ({
      requiresReview,
      handle,
      platform
    }: {
      requiresReview: boolean
      handle: string
      platform: 'twitter' | 'instagram' | 'tiktok'
    }) => {
      dispatch(setValueField('handle', handle))
      if (!requiresReview) {
        navigate(SIGN_UP_FINISH_PROFILE_PAGE)
      } else {
        navigate(SIGN_UP_REVIEW_HANDLE_PAGE)
      }
      toast(socialMediaMessages.socialMediaLoginSucess(platform))
    },
    [dispatch, navigate, toast]
  )

  const initialValues = {
    handle: alreadyLinkedSocial ? '' : handle
  }

  return (
    <Formik
      initialValues={initialValues}
      validationSchema={validationSchema}
      onSubmit={handleSubmit}
      validateOnChange={false}
    >
      <Page as={Form} centered={!isMobile} transitionBack='vertical'>
        {isWaitingForSocialLogin ? (
          <SocialMediaLoading />
        ) : (
          <>
            <Heading
              prefix={
                isMobile ? null : <OutOfText numerator={1} denominator={2} />
              }
              heading={messages.title}
              description={messages.description}
              centered={!isMobile}
            />
            <Flex direction='column' gap={isMobile ? 'l' : 'xl'}>
              <HandleField
                autoFocus
                onCompleteSocialMediaLogin={handleCompleteSocialMediaLogin}
                onStartSocialMediaLogin={handleStartSocialMediaLogin}
                onErrorSocialMediaLogin={handleErrorSocialMediaLogin}
              />
              <Divider>
                <Text
                  variant='body'
                  color='subdued'
                  size='s'
                  css={{ textTransform: 'uppercase' }}
                >
                  {messages.or}
                </Text>
              </Divider>
              <SocialMediaSection
                onStart={handleStartSocialMediaLogin}
                onError={handleErrorSocialMediaLogin}
                onCompleteSocialMediaLogin={handleCompleteSocialMediaLogin}
              />
            </Flex>
            <PageFooter centered />
          </>
        )}
      </Page>
    </Formik>
  )
}
