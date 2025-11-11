import { useCallback } from 'react'

import { finishProfilePageMessages } from '@audius/common/messages'
import { finishProfileSchema } from '@audius/common/schemas'
import { MAX_DISPLAY_NAME_LENGTH } from '@audius/common/services'
import { type Image } from '@audius/common/store'
import { css } from '@emotion/native'
import {
  setField,
  setValueField,
  signUp
} from 'common/store/pages/signon/actions'
import {
  getCoverPhotoField,
  getHandleField,
  getIsVerified,
  getNameField,
  getProfileImageField
} from 'common/store/pages/signon/selectors'
import { Formik, useField } from 'formik'
import { isEmpty } from 'lodash'
import type {
  NativeSyntheticEvent,
  TextInputFocusEventData
} from 'react-native'
import { useDispatch, useSelector } from 'react-redux'
import { toFormikValidationSchema } from 'zod-formik-adapter'

import { Paper, useTheme, Flex } from '@audius/harmony-native'
import { ScrollView } from 'app/components/core'
import { HarmonyTextField } from 'app/components/fields'
import { useNavigation } from 'app/hooks/useNavigation'
import { make, track } from 'app/services/analytics'
import { EventNames } from 'app/types/analytics'
import { launchSelectImageActionSheet } from 'app/utils/launchSelectImageActionSheet'

import { AccountHeader } from '../components/AccountHeader'
import { Heading, Page, PageFooter } from '../components/layout'
import { useFastReferral } from '../hooks/useFastReferral'
import type { SignOnScreenParamList } from '../types'
import { useTrackScreen } from '../utils/useTrackScreen'

const finishProfileFormikSchema = toFormikValidationSchema(finishProfileSchema)

type FinishProfileValues = {
  displayName: string
  profileImage: Image
  coverPhoto?: Image
}

export const FinishProfileScreen = () => {
  const navigation = useNavigation<SignOnScreenParamList>()
  const dispatch = useDispatch()
  const { spacing } = useTheme()
  const savedProfileImage = useSelector(getProfileImageField)
  const savedCoverPhoto = useSelector(getCoverPhotoField)
  const { value: savedDisplayName } = useSelector(getNameField) ?? {}
  const isFastReferral = useFastReferral()

  useTrackScreen('FinishProfile')

  const handleSubmit = useCallback(
    (values: FinishProfileValues) => {
      const { displayName } = values
      dispatch(setValueField('name', displayName))
      if (isFastReferral) {
        // Fast referral: create account immediately and skip genre/artist selection
        dispatch(signUp())
        navigation.navigate('AccountLoading')
      } else {
        // Normal flow: don't create account yet, let user select genres/artists first
        navigation.navigate('SelectGenre')
      }
    },
    [dispatch, isFastReferral, navigation]
  )

  const displayNameValue = savedDisplayName || ''
  const initialValues = {
    profileImage: savedProfileImage || ({} as Image),
    coverPhoto: savedCoverPhoto || ({} as Image),
    displayName: displayNameValue
  }

  const saveDisplayName = useCallback(
    (e: NativeSyntheticEvent<TextInputFocusEventData>) => {
      const displayName = e.nativeEvent.text
      dispatch(setValueField('name', displayName))
    },
    [dispatch]
  )

  return (
    <Formik
      initialValues={initialValues}
      onSubmit={handleSubmit}
      validationSchema={finishProfileFormikSchema}
    >
      <Page>
        <ScrollView>
          <Flex gap='2xl'>
            <Heading
              heading={finishProfilePageMessages.header}
              description={finishProfilePageMessages.description}
            />
            <Paper>
              <AccountHeaderField />
              <HarmonyTextField
                name='displayName'
                label={finishProfilePageMessages.displayName}
                placeholder={finishProfilePageMessages.inputPlaceholder}
                maxLength={MAX_DISPLAY_NAME_LENGTH}
                autoComplete='off'
                value={displayNameValue}
                onChange={saveDisplayName}
                style={css({
                  padding: spacing.l,
                  paddingTop: spacing.unit10
                })}
              />
            </Paper>
          </Flex>
        </ScrollView>
        <PageFooter />
      </Page>
    </Formik>
  )
}

const AccountHeaderField = () => {
  const [{ value: profileImage }, , { setValue: setProfileImage }] =
    useField<Image>('profileImage')
  const dispatch = useDispatch()

  const handleSelectProfilePicture = useCallback(() => {
    const handleImageSelected = (image: Image) => {
      dispatch(setField('profileImage', image))
      setProfileImage(image)
      track(
        make({
          eventName: EventNames.CREATE_ACCOUNT_UPLOAD_PROFILE_PHOTO
        })
      )
    }

    launchSelectImageActionSheet(
      handleImageSelected,
      { height: 1000, width: 1000, cropperCircleOverlay: true },
      'profilePicture'
    )
  }, [dispatch, setProfileImage])

  const [{ value: coverPhoto }, , { setValue: setCoverPhoto }] =
    useField<Image>('coverPhoto')

  const handleSelectCoverPhoto = useCallback(() => {
    const handleImageSelected = (image: Image) => {
      setCoverPhoto(image)
      dispatch(setField('coverPhoto', image))
      track(
        make({
          eventName: EventNames.CREATE_ACCOUNT_UPLOAD_COVER_PHOTO
        })
      )
    }
    launchSelectImageActionSheet(
      handleImageSelected,
      { height: 1000, width: 2000, freeStyleCropEnabled: true },
      'coverPhoto'
    )
  }, [dispatch, setCoverPhoto])

  const [{ value: displayName }] = useField('displayName')
  const { value: handle } = useSelector(getHandleField)
  const isVerified = useSelector(getIsVerified)

  return (
    <AccountHeader
      profilePicture={isEmpty(profileImage) ? undefined : profileImage}
      coverPhoto={isEmpty(coverPhoto) ? undefined : coverPhoto}
      onSelectProfilePicture={handleSelectProfilePicture}
      onSelectCoverPhoto={handleSelectCoverPhoto}
      displayName={displayName}
      handle={handle}
      isVerified={isVerified}
    />
  )
}
