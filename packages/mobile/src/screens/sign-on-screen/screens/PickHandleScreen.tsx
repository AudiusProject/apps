import { useCallback, useMemo } from 'react'

import { useQueryContext } from '@audius/common/api'
import { pickHandlePageMessages } from '@audius/common/messages'
import type { SocialPlatform } from '@audius/common/models'
import { pickHandleSchema } from '@audius/common/schemas'
import { getIsSocialConnected } from '@audius/web/src/common/store/pages/signon/selectors'
import { useQueryClient } from '@tanstack/react-query'
import {
  setValueField,
  unsetSocialProfile
} from 'common/store/pages/signon/actions'
import { Formik } from 'formik'
import { useDispatch, useSelector } from 'react-redux'
import { toFormikValidationSchema } from 'zod-formik-adapter'

import {
  Divider,
  Flex,
  IconVerified,
  Paper,
  Text,
  useTheme
} from '@audius/harmony-native'
import { ScrollView } from 'app/components/core'
import { useNavigation } from 'app/hooks/useNavigation'

import { HandleField } from '../components/HandleField'
import { SocialMediaLoading } from '../components/SocialMediaLoading'
import { SocialMediaSignUpButtons } from '../components/SocialMediaSignUpButtons'
import { Heading, Page, PageFooter } from '../components/layout'
import { useSocialMediaLoader } from '../components/useSocialMediaLoader'
import { useFastReferral } from '../hooks/useFastReferral'
import type { SignOnScreenParamList } from '../types'
import { restrictedHandles } from '../utils/restrictedHandles'
import { useTrackScreen } from '../utils/useTrackScreen'

const initialValues = {
  handle: ''
}

type PickHandleValues = {
  handle: string
}

type SocialMediaSectionProps = {
  onCompleteSocialMediaLogin: (info: {
    requiresReview: boolean
    handle: string
    platform: SocialPlatform
  }) => void
  onStart: () => void
  onError: () => void
  onClose: () => void
}

const SocialMediaSection = ({
  onCompleteSocialMediaLogin,
  onStart,
  onError,
  onClose
}: SocialMediaSectionProps) => {
  const { spacing } = useTheme()
  return (
    <Paper
      shadow='flat'
      direction='column'
      backgroundColor='surface2'
      p='l'
      gap='l'
    >
      <Flex direction='column' gap='s'>
        <Text variant='title' size='m'>
          {pickHandlePageMessages.claimHandleHeaderPrefix}{' '}
          <Text color='accent'>@{pickHandlePageMessages.handle}</Text>
          <IconVerified size='s' style={{ marginLeft: spacing.xs }} />
        </Text>
        <Text variant='body' size='m'>
          {pickHandlePageMessages.claimHandleDescription}
        </Text>
      </Flex>
      <SocialMediaSignUpButtons
        onStart={onStart}
        onError={onError}
        onClose={onClose}
        onCompleteSocialMediaLogin={onCompleteSocialMediaLogin}
        page='pick-handle'
      />
      <Text variant='body' size='m'>
        {pickHandlePageMessages.claimHandleHeadsUp}
      </Text>
    </Paper>
  )
}

export const PickHandleScreen = () => {
  const navigation = useNavigation<SignOnScreenParamList>()
  const dispatch = useDispatch()
  const alreadyLinkedSocial = useSelector(getIsSocialConnected)
  const isFastReferral = useFastReferral()
  const {
    isWaitingForSocialLogin,
    handleStartSocialMediaLogin,
    handleErrorSocialMediaLogin,
    handleCloseSocialMediaLogin,
    handleCompleteSocialMediaLogin
  } = useSocialMediaLoader({
    resetAction: unsetSocialProfile,
    linkedSocialOnThisPagePreviously: alreadyLinkedSocial
  })
  useTrackScreen('PickHandle')

  const queryContext = useQueryContext()
  const queryClient = useQueryClient()
  const validationSchema = useMemo(
    () =>
      toFormikValidationSchema(
        pickHandleSchema({ queryContext, queryClient, restrictedHandles })
      ),
    [queryContext, queryClient]
  )

  const handleSubmit = useCallback(
    (values: PickHandleValues) => {
      const { handle } = values
      dispatch(setValueField('handle', handle))
      if (isFastReferral) {
        dispatch(setValueField('name', handle))
      }
      navigation.navigate('FinishProfile')
    },
    [dispatch, isFastReferral, navigation]
  )

  const handleSocialMediaLoginSuccess = useCallback(
    ({
      requiresReview,
      handle
    }: {
      requiresReview: boolean
      handle: string
      platform: SocialPlatform
    }) => {
      handleCompleteSocialMediaLogin()
      dispatch(setValueField('handle', handle))
      if (isFastReferral) {
        dispatch(setValueField('name', handle))
      }
      if (requiresReview) {
        navigation.navigate('ReviewHandle')
      } else {
        navigation.navigate('FinishProfile')
      }
    },
    [dispatch, handleCompleteSocialMediaLogin, isFastReferral, navigation]
  )

  return (
    <Formik
      initialValues={initialValues}
      onSubmit={handleSubmit}
      validationSchema={validationSchema}
      validateOnChange={false}
    >
      <Page>
        {isWaitingForSocialLogin ? (
          <SocialMediaLoading onClose={handleCloseSocialMediaLogin} hideIcon />
        ) : null}
        <ScrollView>
          <Flex direction='column' gap='l'>
            <Heading
              heading={pickHandlePageMessages.title}
              description={pickHandlePageMessages.description}
            />
            <HandleField />
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
              onClose={handleCloseSocialMediaLogin}
              onCompleteSocialMediaLogin={handleSocialMediaLoginSuccess}
            />
          </Flex>
        </ScrollView>
        <PageFooter />
      </Page>
    </Formik>
  )
}
