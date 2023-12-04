import { useCallback } from 'react'

import { Paper, PlainButton, PlainButtonType } from '@audius/harmony'
import { Formik, Form } from 'formik'
import { useDispatch, useSelector } from 'react-redux'
import { useHistory } from 'react-router-dom'
import { z } from 'zod'
import { toFormikValidationSchema } from 'zod-formik-adapter'

import { setField, setValueField } from 'common/store/pages/signon/actions'
import {
  getCoverPhotoField,
  getNameField,
  getProfileImageField
} from 'common/store/pages/signon/selectors'
import { HarmonyTextField } from 'components/form-fields/HarmonyTextField'
import { useMedia } from 'hooks/useMedia'
import { useNavigateToPage } from 'hooks/useNavigateToPage'
import { SIGN_UP_GENRES_PAGE } from 'utils/route'

import { AccountHeader } from '../components/AccountHeader'
import { ImageFieldValue } from '../components/ImageField'
import { OutOfText } from '../components/OutOfText'
import { Heading, Page, PageFooter } from '../components/layout'

const messages = {
  header: 'Finish Your Profile',
  description:
    'Your photos & display name is how others see you. Customize with special character, spaces, emojis, whatever!',
  displayName: 'Display Name',
  inputPlaceholder: 'express yourself 💫',
  goBack: 'Go back'
}

export type FinishProfileValues = {
  profileImage: ImageFieldValue
  coverPhoto?: ImageFieldValue
  displayName: string
}

const formSchema = toFormikValidationSchema(
  z.object({
    displayName: z.string(),
    profileImage: z.object({
      url: z.string()
    }),
    coverPhoto: z
      .object({
        url: z.string().optional()
      })
      .optional()
  })
)

export const FinishProfilePage = () => {
  const { isMobile } = useMedia()
  const history = useHistory()
  const dispatch = useDispatch()
  const navigate = useNavigateToPage()

  const { value: savedDisplayName } = useSelector(getNameField)
  const { value: savedCoverPhoto } = useSelector(getCoverPhotoField) ?? {}
  const { value: savedProfileImage } = useSelector(getProfileImageField) ?? {}

  // If the user comes back from a later page we start with whats in the store
  const initialValues = {
    profileImage: savedProfileImage,
    coverPhoto: savedCoverPhoto,
    displayName: savedDisplayName || ''
  }

  const handleSubmit = useCallback(
    ({ coverPhoto, profileImage, displayName }: FinishProfileValues) => {
      dispatch(setValueField('name', displayName))
      dispatch(setField('profileImage', { value: profileImage }))
      if (coverPhoto) {
        dispatch(setField('coverPhoto', { value: coverPhoto }))
      }
      navigate(SIGN_UP_GENRES_PAGE)
    },
    [navigate, dispatch]
  )

  return (
    <Formik
      initialValues={initialValues}
      onSubmit={handleSubmit}
      validationSchema={formSchema}
      validateOnMount
      validateOnChange
    >
      {({ isValid, values }) => (
        <Page as={Form} centered>
          <Heading
            prefix={
              isMobile ? null : <OutOfText numerator={2} denominator={2} />
            }
            heading={messages.header}
            description={messages.description}
            alignItems={!isMobile ? 'center' : undefined}
          />
          <Paper direction='column'>
            <AccountHeader
              mode='editing'
              formDisplayName={values.displayName}
              formProfileImage={values.profileImage}
            />
            <HarmonyTextField
              name='displayName'
              label={messages.displayName}
              placeholder={messages.inputPlaceholder}
              required
              maxLength={32}
              css={(theme) => ({
                padding: theme.spacing.l,
                paddingTop: theme.spacing.unit10
              })}
            />
          </Paper>
          <PageFooter
            centered
            buttonProps={{ disabled: !isValid }}
            postfix={
              isMobile ? null : (
                <PlainButton
                  variant={PlainButtonType.SUBDUED}
                  onClick={history.goBack}
                >
                  {messages.goBack}
                </PlainButton>
              )
            }
          />
        </Page>
      )}
    </Formik>
  )
}
