import { useCallback, useRef } from 'react'

import { finishProfilePageMessages } from '@audius/common/messages'
import { Name } from '@audius/common/models'
import {
  finishProfileSchema,
  finishReferralProfileSchema
} from '@audius/common/schemas'
import { MAX_DISPLAY_NAME_LENGTH } from '@audius/common/services'
import { route } from '@audius/common/utils'
import { Button, Flex, Paper, Text } from '@audius/harmony'
import { Formik, Form, useFormikContext } from 'formik'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { toFormikValidationSchema } from 'zod-formik-adapter'

import { make } from 'common/store/analytics/actions'
import {
  setField,
  setValueField,
  setFinishedPhase1,
  signUp
} from 'common/store/pages/signon/actions'
import {
  getCoverPhotoField,
  getEmailField,
  getHandleField,
  getIsSocialConnected,
  getLinkedSocialOnFirstPage,
  getNameField,
  getProfileImageField
} from 'common/store/pages/signon/selectors'
import { HarmonyTextField } from 'components/form-fields/HarmonyTextField'
import { useMedia } from 'hooks/useMedia'

import { AccountHeader } from '../components/AccountHeader'
import { ImageFieldValue } from '../components/ImageField'
import { OutOfText } from '../components/OutOfText'
import { Heading, Page, PageFooter } from '../components/layout'
import { useFastReferral } from '../hooks/useFastReferral'

const { SIGN_UP_GENRES_PAGE, SIGN_UP_LOADING_PAGE } = route

type FinishProfileValues = {
  profileImage?: ImageFieldValue
  coverPhoto?: ImageFieldValue
  displayName: string
}

const formSchema = toFormikValidationSchema(finishProfileSchema)
const referralformSchema = toFormikValidationSchema(finishReferralProfileSchema)

const ImageUploadErrorText = () => {
  const { errors } = useFormikContext<FinishProfileValues>()
  let errorText
  if (errors.coverPhoto === finishProfilePageMessages.coverPhotoUploadError) {
    errorText = errors.coverPhoto
  }
  // Profile image error takes priority
  if (
    errors.profileImage === finishProfilePageMessages.profileImageUploadError
  ) {
    // If both images have errors, we show a combined error message
    if (errorText !== undefined) {
      errorText = finishProfilePageMessages.bothImageUploadError
    } else {
      errorText = errors.profileImage
    }
  }

  return (
    <Flex ph='l' pt='2xl'>
      {errorText ? (
        <Text variant='body' size='m' strength='default' color='danger'>
          {errorText}
        </Text>
      ) : null}
    </Flex>
  )
}

export const FinishProfilePage = () => {
  const { isMobile } = useMedia()
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const displayNameInputRef = useRef<HTMLInputElement>(null)

  const { value: savedDisplayName } = useSelector(getNameField)
  const handle = useSelector(getHandleField)
  const email = useSelector(getEmailField)
  const isSocialConnected = useSelector(getIsSocialConnected)
  const linkedSocialOnFirstPage = useSelector(getLinkedSocialOnFirstPage)
  const savedCoverPhoto = useSelector(getCoverPhotoField)
  const savedProfileImage = useSelector(getProfileImageField)
  const isFastReferral = useFastReferral()

  // If the user comes back from a later page we start with whats in the store
  const initialValues = {
    profileImage: savedProfileImage || undefined,
    coverPhoto: savedCoverPhoto || undefined,
    displayName: savedDisplayName || ''
  }

  const setCoverPhoto = useCallback(
    (value: ImageFieldValue) => {
      dispatch(setField('coverPhoto', value))
      dispatch(make(Name.CREATE_ACCOUNT_UPLOAD_COVER_PHOTO, { handle, email }))
    },
    [dispatch, email, handle]
  )

  const setProfileImage = useCallback(
    (value: ImageFieldValue) => {
      dispatch(setField('profileImage', value))
      dispatch(
        make(Name.CREATE_ACCOUNT_UPLOAD_PROFILE_PHOTO, { handle, email })
      )
    },
    [dispatch, email, handle]
  )

  const setDisplayName = useCallback(
    (value: string) => {
      dispatch(setValueField('name', value))
    },
    [dispatch]
  )

  const handleSubmit = useCallback(
    ({ coverPhoto, profileImage, displayName }: FinishProfileValues) => {
      dispatch(setValueField('name', displayName))
      if (profileImage) {
        dispatch(setField('profileImage', profileImage))
      }
      if (coverPhoto) {
        dispatch(setField('coverPhoto', coverPhoto))
      }
      dispatch(setFinishedPhase1(true))
      if (isFastReferral) {
        // Fast referral: create account immediately and skip genre/artist selection
        dispatch(signUp())
        navigate(SIGN_UP_LOADING_PAGE)
      } else {
        // Normal flow: don't create account yet, let user select genres/artists first
        navigate(SIGN_UP_GENRES_PAGE)
      }
    },
    [dispatch, isFastReferral, navigate]
  )

  return (
    <Formik
      initialValues={initialValues}
      onSubmit={handleSubmit}
      validationSchema={isFastReferral ? referralformSchema : formSchema}
      validateOnMount
      validateOnChange
    >
      {({ isValid, values }) => (
        <Page
          as={Form}
          centered
          transition={isMobile ? 'horizontal' : 'vertical'}
          transitionBack='horizontal'
          autoFocusInputRef={displayNameInputRef}
        >
          <Heading
            prefix={
              isMobile || linkedSocialOnFirstPage ? null : (
                <OutOfText numerator={2} denominator={2} />
              )
            }
            heading={finishProfilePageMessages.header}
            description={finishProfilePageMessages.description}
            centered={!isMobile}
          />
          <Paper direction='column' style={{ flexShrink: 0 }}>
            <AccountHeader
              mode='editing'
              formDisplayName={values.displayName}
              formProfileImage={values.profileImage}
              onProfileImageChange={setProfileImage}
              onCoverPhotoChange={setCoverPhoto}
            />
            <ImageUploadErrorText />
            <HarmonyTextField
              ref={displayNameInputRef}
              name='displayName'
              label={finishProfilePageMessages.displayName}
              placeholder={finishProfilePageMessages.inputPlaceholder}
              maxLength={MAX_DISPLAY_NAME_LENGTH}
              onChange={(e) => setDisplayName(e.currentTarget.value)}
              css={(theme) => ({
                padding: theme.spacing.l
              })}
            />
          </Paper>
          <PageFooter
            centered
            sticky
            buttonProps={{ disabled: !isValid }}
            postfix={
              isMobile || isSocialConnected ? null : (
                <Button
                  variant='secondary'
                  fullWidth
                  onClick={() => navigate(-1)}
                >
                  {finishProfilePageMessages.goBack}
                </Button>
              )
            }
          />
        </Page>
      )}
    </Formik>
  )
}
