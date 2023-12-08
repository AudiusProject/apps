import { useCallback, useContext, useMemo } from 'react'

import {
  useAudiusQueryContext,
  socialMediaMessages,
  pickHandlePageMessages as messages,
  pickHandleSchema
} from '@audius/common'
import { Divider, Flex, IconVerified, Paper, Text } from '@audius/harmony'
import { Form, Formik } from 'formik'
import { useDispatch, useSelector } from 'react-redux'
import { toFormikValidationSchema } from 'zod-formik-adapter'

import { setValueField } from 'common/store/pages/signon/actions'
import {
  getHandleField,
  getLinkedSocialOnFirstPage
} from 'common/store/pages/signon/selectors'
import { ToastContext } from 'components/toast/ToastContext'
import { useMedia } from 'hooks/useMedia'
import { useNavigateToPage } from 'hooks/useNavigateToPage'
import { restrictedHandles } from 'utils/restrictedHandles'
import {
  SIGN_UP_CREATE_LOGIN_DETAILS,
  SIGN_UP_FINISH_PROFILE_PAGE,
  SIGN_UP_REVIEW_HANDLE_PAGE
} from 'utils/route'

import { HandleField } from '../components/HandleField'
import { OutOfText } from '../components/OutOfText'
import { SocialMediaLoginOptions } from '../components/SocialMediaLoginOptions'
import { Heading, Page, PageFooter } from '../components/layout'
type PickHandleValues = {
  handle: string
}

type SocialMediaSectionProps = {
  onCompleteSocialMediaLogin: (info: {
    requiresReview: boolean
    handle: string
    platform: 'twitter' | 'instagram' | 'tiktok'
  }) => void
}

const SocialMediaSection = ({
  onCompleteSocialMediaLogin
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
  const navigate = useNavigateToPage()
  const { toast } = useContext(ToastContext)
  const audiusQueryContext = useAudiusQueryContext()
  const validationSchema = useMemo(() => {
    return toFormikValidationSchema(
      pickHandleSchema({ audiusQueryContext, restrictedHandles })
    )
  }, [audiusQueryContext])

  const { value: handle } = useSelector(getHandleField)
  const isLinkingSocialOnFirstPage = useSelector(getLinkedSocialOnFirstPage)

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
    handle
  }

  return (
    <Formik
      initialValues={initialValues}
      validationSchema={validationSchema}
      onSubmit={handleSubmit}
      validateOnChange={false}
    >
      <Page as={Form} centered={!isMobile} transitionBack='vertical'>
        <Heading
          prefix={isMobile ? null : <OutOfText numerator={1} denominator={2} />}
          heading={messages.title}
          description={messages.description}
          centered={!isMobile}
        />
        <Flex direction='column' gap={isMobile ? 'l' : 'xl'}>
          <HandleField
            autoFocus
            onCompleteSocialMediaLogin={handleCompleteSocialMediaLogin}
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
            onCompleteSocialMediaLogin={handleCompleteSocialMediaLogin}
          />
        </Flex>
        <PageFooter centered />
      </Page>
    </Formik>
  )
}
