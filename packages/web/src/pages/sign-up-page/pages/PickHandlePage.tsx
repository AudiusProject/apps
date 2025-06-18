import { useCallback, useContext, useMemo, useRef } from 'react'

import { useQueryContext } from '@audius/common/api'
import {
  pickHandlePageMessages,
  socialMediaMessages
} from '@audius/common/messages'
import { SocialPlatform } from '@audius/common/models'
import { pickHandleSchema } from '@audius/common/schemas'
import { route } from '@audius/common/utils'
import { Divider, Flex, IconVerified, Paper, Text } from '@audius/harmony'
import { useQueryClient } from '@tanstack/react-query'
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
import { restrictedHandles } from 'utils/restrictedHandles'

import { HandleField } from '../components/HandleField'
import { OutOfText } from '../components/OutOfText'
import { SocialMediaLoading } from '../components/SocialMediaLoading'
import { SocialMediaLoginOptions } from '../components/SocialMediaLoginOptions'
import { Heading, Page, PageFooter } from '../components/layout'
import { useFastReferral } from '../hooks/useFastReferral'
import { useSocialMediaLoader } from '../hooks/useSocialMediaLoader'

const {
  SIGN_UP_CREATE_LOGIN_DETAILS,
  SIGN_UP_FINISH_PROFILE_PAGE,
  SIGN_UP_REVIEW_HANDLE_PAGE
} = route

type PickHandleValues = {
  handle: string
}

type SocialMediaSectionProps = {
  onCompleteSocialMediaLogin: (info: {
    requiresReview: boolean
    handle: string
    platform: SocialPlatform
  }) => void
  onStart: (platform: SocialPlatform) => void
  onError: (error: Error, platform: SocialPlatform) => void
}
const SocialMediaSection = (props: SocialMediaSectionProps) => {
  const { onCompleteSocialMediaLogin, onStart, onError } = props
  const { isMobile } = useMedia()

  return (
    <Paper direction='column' backgroundColor='surface2' p='l' gap='l'>
      <Flex direction='column' gap='s'>
        <Text
          variant={isMobile ? 'title' : 'heading'}
          size={isMobile ? 'm' : 's'}
        >
          {pickHandlePageMessages.claimHandleHeaderPrefix}{' '}
          <Text color='accent'>@{pickHandlePageMessages.handle}</Text>{' '}
          <IconVerified
            size={isMobile ? 's' : 'm'}
            css={{ verticalAlign: 'sub' }}
          />
        </Text>
        <Text variant='body' size={isMobile ? 'm' : 'l'}>
          {pickHandlePageMessages.claimHandleDescription}
        </Text>
      </Flex>
      <SocialMediaLoginOptions
        onStart={onStart}
        onError={onError}
        onCompleteSocialMediaLogin={onCompleteSocialMediaLogin}
      />
      <Text variant='body' size={isMobile ? 'm' : 'l'}>
        {pickHandlePageMessages.claimHandleHeadsUp}
      </Text>
    </Paper>
  )
}

export const PickHandlePage = () => {
  const { isMobile } = useMedia()
  const dispatch = useDispatch()
  const queryContext = useQueryContext()
  const queryClient = useQueryClient()

  const PickHandleValidationSchema = useMemo(
    () =>
      toFormikValidationSchema(
        pickHandleSchema({ queryContext, queryClient, restrictedHandles })
      ),
    [queryContext, queryClient]
  )

  const alreadyLinkedSocial = useSelector(getIsSocialConnected)
  const {
    isWaitingForSocialLogin,
    handleStartSocialMediaLogin,
    handleErrorSocialMediaLogin
  } = useSocialMediaLoader({
    resetAction: unsetSocialProfile,
    linkedSocialOnThisPagePreviously: alreadyLinkedSocial,
    page: 'pick-handle'
  })

  const navigate = useNavigateToPage()
  const { toast } = useContext(ToastContext)

  const { value: handle } = useSelector(getHandleField)
  const isLinkingSocialOnFirstPage = useSelector(getLinkedSocialOnFirstPage)
  const handleInputRef = useRef<HTMLInputElement>(null)
  const isFastReferral = useFastReferral()

  const handleSubmit = useCallback(
    (values: PickHandleValues) => {
      const { handle } = values
      dispatch(setValueField('handle', handle))
      if (isFastReferral) {
        dispatch(setValueField('name', handle))
      }
      navigate(
        isLinkingSocialOnFirstPage
          ? SIGN_UP_CREATE_LOGIN_DETAILS
          : SIGN_UP_FINISH_PROFILE_PAGE
      )
    },
    [dispatch, isFastReferral, navigate, isLinkingSocialOnFirstPage]
  )

  const handleCompleteSocialMediaLogin = useCallback(
    ({
      requiresReview,
      handle,
      platform
    }: {
      requiresReview: boolean
      handle: string
      platform: SocialPlatform
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
      validationSchema={PickHandleValidationSchema}
      onSubmit={handleSubmit}
      validateOnChange={false}
    >
      {isWaitingForSocialLogin ? (
        <SocialMediaLoading />
      ) : (
        <Page
          as={Form}
          centered
          transitionBack='vertical'
          autoFocusInputRef={handleInputRef}
        >
          <Heading
            prefix={
              isMobile ? null : <OutOfText numerator={1} denominator={2} />
            }
            heading={pickHandlePageMessages.title}
            description={pickHandlePageMessages.description}
            centered={!isMobile}
          />
          <Flex direction='column' gap={isMobile ? 'l' : 'xl'}>
            <HandleField
              ref={handleInputRef}
              onCompleteSocialMediaLogin={handleCompleteSocialMediaLogin}
              onStartSocialMediaLogin={handleStartSocialMediaLogin}
              onErrorSocialMediaLogin={handleErrorSocialMediaLogin}
            />
            <Divider>
              <Text
                variant='body'
                color='subdued'
                size='s'
                textTransform='uppercase'
              >
                {pickHandlePageMessages.or}
              </Text>
            </Divider>
            <SocialMediaSection
              onStart={handleStartSocialMediaLogin}
              onError={handleErrorSocialMediaLogin}
              onCompleteSocialMediaLogin={handleCompleteSocialMediaLogin}
            />
          </Flex>
          <PageFooter centered sticky />
        </Page>
      )}
    </Formik>
  )
}
