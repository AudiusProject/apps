import { useCallback } from 'react'

import { useCurrentAccountUser } from '@audius/common/api'
import type { UserMetadata } from '@audius/common/models'
import { SquareSizes, WidthSizes } from '@audius/common/models'
import {
  MAX_BIO_LENGTH,
  MAX_DISPLAY_NAME_LENGTH
} from '@audius/common/services'
import { profilePageActions } from '@audius/common/store'
import type { FormikProps } from 'formik'
import { Formik } from 'formik'
import { isEmpty, pick } from 'lodash'
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view'
import { useDispatch } from 'react-redux'

import {
  Flex,
  IconInstagram,
  IconLink,
  IconTikTok,
  IconX
} from '@audius/harmony-native'
import { useBottomBarInset } from 'app/components/core/BottomBarInsetContext'
import { useCoverPhoto } from 'app/components/image/CoverPhoto'
import { useProfilePicture } from 'app/components/image/UserImage'
import { useNavigation } from 'app/hooks/useNavigation'
import type { Image } from 'app/types/image'
import { isImageUriSource } from 'app/utils/image'

import { FanClubFlairSelector } from './FanClubFlairSelector'
import { FormGroup } from './FormGroup'
import { FormScreen } from './FormScreen'
import { GroupedTextField } from './GroupedTextField'
import { ProfileHeader } from './ProfileHeader'
import type { FanClubBadge, ProfileValues, UpdatedProfile } from './types'

const { updateProfile } = profilePageActions

const messages = {
  profile: 'Profile',
  social: 'Social',
  fanClubFlair: 'Fan club flair',
  name: 'Name',
  namePlaceholder: 'Your name',
  bio: 'Bio',
  bioPlaceholder: 'Tell people about yourself',
  location: 'Location',
  locationPlaceholder: 'City, country',
  handlePlaceholder: 'username',
  website: 'Website',
  websitePlaceholder: 'yourwebsite.com'
}

type EditProfileFormProps = FormikProps<ProfileValues>

const EditProfileForm = (props: EditProfileFormProps) => {
  const { handleSubmit, errors, dirty, values, setFieldValue } = props
  const bottomBarInset = useBottomBarInset()

  const handleFanClubBadgeChange = useCallback(
    (badge: FanClubBadge | null) => {
      setFieldValue('fan_club_badge', badge)
    },
    [setFieldValue]
  )

  return (
    <FormScreen onSubmit={handleSubmit} canSubmit={dirty && isEmpty(errors)}>
      <KeyboardAwareScrollView
        keyboardShouldPersistTaps='handled'
        contentContainerStyle={{
          padding: 16,
          paddingBottom: bottomBarInset + 32
        }}
      >
        <Flex gap='xl' w='100%'>
          <ProfileHeader />

          <FormGroup title={messages.profile}>
            <GroupedTextField
              name='name'
              label={messages.name}
              placeholder={messages.namePlaceholder}
              maxLength={MAX_DISPLAY_NAME_LENGTH}
            />
            <GroupedTextField
              name='bio'
              label={messages.bio}
              placeholder={messages.bioPlaceholder}
              maxLength={MAX_BIO_LENGTH}
              multiline
            />
            <GroupedTextField
              name='location'
              label={messages.location}
              placeholder={messages.locationPlaceholder}
            />
          </FormGroup>

          <FormGroup title={messages.social}>
            <GroupedTextField
              name='twitter_handle'
              label='X'
              icon={IconX}
              prefix='@'
              placeholder={messages.handlePlaceholder}
              autoCapitalize='none'
              autoCorrect={false}
            />
            <GroupedTextField
              name='instagram_handle'
              label='Instagram'
              icon={IconInstagram}
              prefix='@'
              placeholder={messages.handlePlaceholder}
              autoCapitalize='none'
              autoCorrect={false}
            />
            <GroupedTextField
              name='tiktok_handle'
              label='TikTok'
              icon={IconTikTok}
              prefix='@'
              placeholder={messages.handlePlaceholder}
              autoCapitalize='none'
              autoCorrect={false}
            />
            <GroupedTextField
              name='website'
              label={messages.website}
              icon={IconLink}
              placeholder={messages.websitePlaceholder}
              autoCapitalize='none'
              autoCorrect={false}
              keyboardType='url'
            />
          </FormGroup>

          <FormGroup title={messages.fanClubFlair}>
            <Flex p='l'>
              <FanClubFlairSelector
                selectedBadge={values.fan_club_badge}
                onChange={handleFanClubBadgeChange}
              />
            </Flex>
          </FormGroup>
        </Flex>
      </KeyboardAwareScrollView>
    </FormScreen>
  )
}

export const EditProfileScreen = () => {
  const { data: profile } = useCurrentAccountUser({
    select: (user) =>
      pick(user, [
        'user_id',
        'verified_with_twitter',
        'verified_with_instagram',
        'verified_with_tiktok',
        'name',
        'bio',
        'location',
        'twitter_handle',
        'instagram_handle',
        'tiktok_handle',
        'website',
        'fan_club_badge'
      ])
  })

  const dispatch = useDispatch()
  const navigation = useNavigation()

  const { source: coverPhotoSource } = useCoverPhoto({
    userId: profile?.user_id,
    size: WidthSizes.SIZE_640
  })
  const { source: imageSource } = useProfilePicture({
    userId: profile?.user_id,
    size: SquareSizes.SIZE_480_BY_480
  })

  const handleSubmit = useCallback(
    (values: ProfileValues) => {
      if (!profile) return
      const { cover_photo, profile_picture, fan_club_badge, ...restValues } =
        values

      // @ts-ignore typing is hard here, will come back
      const newProfile: UpdatedProfile = {
        ...profile,
        ...restValues
      }
      if (cover_photo.file) {
        newProfile.updatedCoverPhoto = cover_photo
      }

      if (profile_picture.file) {
        newProfile.updatedProfilePicture = profile_picture
      }

      // Handle fan club badge
      if (fan_club_badge) {
        if (
          fan_club_badge.mint === '__default__' ||
          fan_club_badge.mint === '__none__'
        ) {
          // Set to null for default/none
          newProfile.fan_club_badge = null
        } else {
          // Set the actual badge
          newProfile.fan_club_badge = fan_club_badge
        }
      }

      dispatch(updateProfile(newProfile as unknown as UserMetadata))
      navigation.goBack()
    },
    [dispatch, navigation, profile]
  )

  if (!profile) return null

  const {
    name = '',
    bio = null,
    location = null,
    twitter_handle = null,
    instagram_handle = null,
    tiktok_handle = null,
    website = null,
    fan_club_badge = null
  } = profile

  const initialValues: ProfileValues = {
    name,
    bio,
    location,
    twitter_handle,
    instagram_handle,
    tiktok_handle,
    website,
    fan_club_badge,
    cover_photo: {
      url:
        coverPhotoSource && isImageUriSource(coverPhotoSource)
          ? coverPhotoSource.uri
          : ''
    } as Image,
    profile_picture: {
      url: imageSource && isImageUriSource(imageSource) ? imageSource.uri : ''
    } as Image
  }

  return (
    <Formik
      initialValues={initialValues}
      onSubmit={handleSubmit}
      enableReinitialize
    >
      {(formikProps) => {
        return <EditProfileForm {...formikProps} />
      }}
    </Formik>
  )
}
