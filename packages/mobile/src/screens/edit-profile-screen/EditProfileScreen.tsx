import { useCallback } from 'react'

import { useCurrentAccountUser } from '@audius/common/api'
import type { UserMetadata } from '@audius/common/models'
import { SquareSizes, WidthSizes } from '@audius/common/models'
import { profilePageActions } from '@audius/common/store'
import type { FormikProps } from 'formik'
import { Formik } from 'formik'
import { pick } from 'lodash'
import { useDispatch } from 'react-redux'

import {
  Flex,
  IconDonate,
  IconInstagram,
  IconLink,
  IconTikTok,
  IconX
} from '@audius/harmony-native'
import { ScrollView } from 'app/components/core'
import { useCoverPhoto } from 'app/components/image/CoverPhoto'
import { useProfilePicture } from 'app/components/image/UserImage'
import { useNavigation } from 'app/hooks/useNavigation'
import { makeStyles } from 'app/styles'
import type { Image } from 'app/types/image'
import { isImageUriSource } from 'app/utils/image'

import { ArtistCoinFlairSelector } from './ArtistCoinFlairSelector'
import { FormScreen } from './FormScreen'
import { ProfileHeader } from './ProfileHeader'
import { ProfileInput } from './ProfileInput'
import { ProfileInputCard } from './ProfileInputCard'
import type { ProfileValues, UpdatedProfile } from './types'

const { updateProfile } = profilePageActions

const useStyles = makeStyles(({ spacing }) => ({
  scrollContent: {
    paddingTop: spacing(6),
    paddingHorizontal: 16, // 16px horizontal margin
    paddingBottom: spacing(24) // Extra padding for bottom action bar
  }
}))

type EditProfileFormProps = FormikProps<ProfileValues> & {
  isXVerified: boolean
  isInstagramVerified: boolean
  isTikTokVerified: boolean
}

const EditProfileForm = (props: EditProfileFormProps) => {
  const {
    handleSubmit,
    handleReset,
    isXVerified,
    isInstagramVerified,
    isTikTokVerified,
    errors
  } = props
  const styles = useStyles()

  return (
    <FormScreen onReset={handleReset} onSubmit={handleSubmit} errors={errors}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Flex direction='column' gap='l' w='100%'>
          {/* Profile Header with Cover Photo, Avatar, and Display Name */}
          <ProfileHeader />

          {/* About You Section */}
          <ProfileInputCard title='About You'>
            <Flex direction='column' gap='xs'>
              <ProfileInput
                name='bio'
                label='Bio'
                placeholder='Tell us about yourself'
                multiline
                maxLength={256}
              />
              <ProfileInput
                name='location'
                label='Location'
                placeholder='City, Country'
              />
            </Flex>
          </ProfileInputCard>

          {/* Artist Coin Flair Section */}
          <ProfileInputCard title='Artist Coin Flair'>
            <ArtistCoinFlairSelector name='artist_coin_flair' />
          </ProfileInputCard>

          {/* Social Handles Section */}
          <ProfileInputCard title='Social Handles'>
            <Flex direction='column' gap='xs'>
              <ProfileInput
                name='twitter_handle'
                label='X'
                placeholder='username'
                startAdornmentText='@'
                Icon={IconX}
                editable={!isXVerified}
              />
              <ProfileInput
                name='instagram_handle'
                label='Instagram'
                placeholder='username'
                startAdornmentText='@'
                Icon={IconInstagram}
                editable={!isInstagramVerified}
              />
              <ProfileInput
                name='tiktok_handle'
                label='TikTok'
                placeholder='username'
                startAdornmentText='@'
                Icon={IconTikTok}
                editable={!isTikTokVerified}
              />
            </Flex>
          </ProfileInputCard>

          {/* Website Section */}
          <ProfileInputCard title='Website'>
            <ProfileInput
              name='website'
              label='Website'
              placeholder='yourwebsite.com'
              Icon={IconLink}
            />
          </ProfileInputCard>

          {/* Donation Section */}
          <ProfileInputCard title='Donation'>
            <ProfileInput
              name='donation'
              label='Donation'
              placeholder='paypal.me/yourlink'
              Icon={IconDonate}
            />
          </ProfileInputCard>
        </Flex>
      </ScrollView>
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
        'donation',
        'artist_coin_flair'
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
      const { cover_photo, profile_picture, ...restValues } = values

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
      dispatch(updateProfile(newProfile as unknown as UserMetadata))
      navigation.goBack()
    },
    [dispatch, navigation, profile]
  )

  if (!profile) return null

  const {
    verified_with_twitter: verifiedWithX = false,
    verified_with_instagram: verifiedWithInstagram = false,
    verified_with_tiktok: verifiedWithTiktok = false,
    name = '',
    bio = null,
    location = null,
    twitter_handle = null,
    instagram_handle = null,
    tiktok_handle = null,
    website = null,
    donation = null
  } = profile

  // @ts-ignore - artist_coin_flair may not exist on user type yet
  const artist_coin_flair = profile.artist_coin_flair ?? null

  const initialValues: ProfileValues = {
    name,
    bio,
    location,
    twitter_handle,
    instagram_handle,
    tiktok_handle,
    website,
    donation,
    artist_coin_flair,
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
        return (
          <EditProfileForm
            {...formikProps}
            isXVerified={verifiedWithX}
            isInstagramVerified={verifiedWithInstagram}
            isTikTokVerified={verifiedWithTiktok}
          />
        )
      }}
    </Formik>
  )
}
