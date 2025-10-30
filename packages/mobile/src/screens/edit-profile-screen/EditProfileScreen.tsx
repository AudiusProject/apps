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
  IconInstagram,
  IconLink,
  IconTikTok,
  IconX
} from '@audius/harmony-native'
import { ScrollView } from 'app/components/core'
import { TextField } from 'app/components/fields'
import { useCoverPhoto } from 'app/components/image/CoverPhoto'
import { useProfilePicture } from 'app/components/image/UserImage'
import { useNavigation } from 'app/hooks/useNavigation'
import { makeStyles } from 'app/styles'
import type { Image } from 'app/types/image'
import { isImageUriSource } from 'app/utils/image'

import { ArtistCoinFlairSelector } from './ArtistCoinFlairSelector'
import { FormScreen } from './FormScreen'
import { ProfileHeader } from './ProfileHeader'
import { ProfileInputCard } from './ProfileInputCard'
import type { ArtistCoinBadge, ProfileValues, UpdatedProfile } from './types'

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
    errors,
    values,
    setFieldValue
  } = props
  const styles = useStyles()

  const handleArtistCoinBadgeChange = useCallback(
    (badge: ArtistCoinBadge | null) => {
      setFieldValue('artist_coin_badge', badge)
    },
    [setFieldValue]
  )

  return (
    <FormScreen onReset={handleReset} onSubmit={handleSubmit} errors={errors}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Flex direction='column' gap='l' w='100%'>
          {/* Profile Header with Cover Photo, Avatar, and Display Name */}
          <ProfileHeader />

          {/* About You Section */}
          <ProfileInputCard title='About You'>
            <Flex direction='column' gap='xs'>
              <TextField
                name='bio'
                label='Bio'
                placeholder='Tell us about yourself'
                multiline
                maxLength={256}
                noGutter
              />
              <TextField
                name='location'
                label='Location'
                placeholder='City, Country'
                noGutter
              />
            </Flex>
          </ProfileInputCard>

          {/* Artist Coin Flair Section */}
          <ProfileInputCard title='Artist Coin Flair'>
            <ArtistCoinFlairSelector
              selectedBadge={values.artist_coin_badge}
              onChange={handleArtistCoinBadgeChange}
            />
          </ProfileInputCard>

          {/* Social Handles Section */}
          <ProfileInputCard title='Social Handles'>
            <Flex direction='column' gap='xs'>
              <TextField
                name='twitter_handle'
                label='X'
                placeholder='username'
                startAdornmentText='@'
                startIcon={IconX}
                editable={!isXVerified}
                noGutter
              />
              <TextField
                name='instagram_handle'
                label='Instagram'
                placeholder='username'
                startAdornmentText='@'
                startIcon={IconInstagram}
                editable={!isInstagramVerified}
                noGutter
              />
              <TextField
                name='tiktok_handle'
                label='TikTok'
                placeholder='username'
                startAdornmentText='@'
                startIcon={IconTikTok}
                editable={!isTikTokVerified}
                noGutter
              />
            </Flex>
          </ProfileInputCard>

          {/* Website Section */}
          <ProfileInputCard title='Website'>
            <TextField
              name='website'
              label='Website'
              placeholder='yourwebsite.com'
              startIcon={IconLink}
              noGutter
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
        'artist_coin_badge'
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
      const { cover_photo, profile_picture, artist_coin_badge, ...restValues } =
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

      // Handle artist coin badge
      if (artist_coin_badge) {
        if (
          artist_coin_badge.mint === '__default__' ||
          artist_coin_badge.mint === '__none__'
        ) {
          // Set to null for default/none
          newProfile.artist_coin_badge = null
        } else {
          // Set the actual badge
          newProfile.artist_coin_badge = artist_coin_badge
        }
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
    artist_coin_badge = null
  } = profile

  const initialValues: ProfileValues = {
    name,
    bio,
    location,
    twitter_handle,
    instagram_handle,
    tiktok_handle,
    website,
    artist_coin_badge,
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
