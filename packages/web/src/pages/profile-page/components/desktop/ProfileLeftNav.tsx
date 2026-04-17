import { useArtistCreatedFanClub } from '@audius/common/api'
import { ID } from '@audius/common/models'
import { Nullable } from '@audius/common/utils'
import {
  Box,
  Flex,
  Text,
  TextArea,
  TextAreaSize,
  useTheme
} from '@audius/harmony'

import Input from 'components/data-entry/Input'
import UploadChip from 'components/upload/UploadChip'
import { Type } from 'pages/profile-page/components/SocialLink'
import { ProfileTopTags } from 'pages/profile-page/components/desktop/ProfileTopTags'
import { zIndex } from 'utils/zIndex'

import { FanClubFlairInput } from '../FanClubFlairInput'
import SocialLinkInput from '../SocialLinkInput'

import { BuyFanClubCard } from './BuyFanClubCard'
import { ProfileBio } from './ProfileBio'
import { ProfileMutuals } from './ProfileMutuals'
import { RecentComments } from './RecentComments'
import { RelatedArtists } from './RelatedArtists'
import { PROFILE_LEFT_COLUMN_WIDTH_PX } from './constants'

const messages = {
  aboutYou: 'About You',
  description: 'Description',
  location: 'Location',
  socialHandles: 'Social Handles',
  fanClubFlair: 'Fan Club Flair',
  website: 'Website'
}

type ProfileLeftNavProps = {
  userId: ID | null
  handle: string
  isArtist: boolean
  created: string
  editMode: boolean
  loading: boolean
  isDeactivated: boolean
  twitterHandle: string
  onUpdateTwitterHandle: (handle: string) => void
  instagramHandle: string
  onUpdateInstagramHandle: (handle: string) => void
  tikTokHandle: string
  onUpdateTikTokHandle: (handle: string) => void
  website: string
  onUpdateWebsite: (website: string) => void
  location: string
  onUpdateLocation: (location: string) => void
  bio: string
  onUpdateBio: (bio: string) => void
  fanClubBadge?: Nullable<{
    mint: string
    logo_uri: string
    ticker: string
  }>
  onUpdateFanClubBadge: (
    badge: {
      mint: string
      logo_uri: string
      ticker: string
    } | null
  ) => void
  twitterVerified: boolean
  instagramVerified: boolean
  tikTokVerified: boolean
  isOwner: boolean
}

export const ProfileLeftNav = (props: ProfileLeftNavProps) => {
  const { spacing } = useTheme()
  const {
    userId,
    handle,
    isArtist,
    created,
    editMode,
    loading,
    isDeactivated,
    twitterHandle,
    onUpdateTwitterHandle,
    instagramHandle,
    onUpdateInstagramHandle,
    tikTokHandle,
    onUpdateTikTokHandle,
    website,
    onUpdateWebsite,
    location,
    onUpdateLocation,
    bio,
    onUpdateBio,
    fanClubBadge,
    onUpdateFanClubBadge,
    twitterVerified,
    instagramVerified,
    tikTokVerified,
    isOwner
  } = props

  const { data: ownedCoin, isPending: isFanClubLoading } =
    useArtistCreatedFanClub(userId)

  const showFanClubCTA = !isFanClubLoading && !!ownedCoin

  if (editMode) {
    return (
      <Box
        css={{
          position: 'relative',
          flexShrink: 0,
          zIndex: zIndex.PROFILE_EDITABLE_COMPONENTS
        }}
        w={PROFILE_LEFT_COLUMN_WIDTH_PX}
      >
        <Flex
          backgroundColor='accent'
          borderRadius='m'
          shadow='far'
          column
          gap='s'
          p='m'
          w='100%'
          css={{ position: 'absolute', top: 0, left: 0, textAlign: 'left' }}
        >
          <Flex column gap='s'>
            <Text variant='title' color='white'>
              {messages.aboutYou}
            </Text>

            <TextArea
              // Ofsetting some internal padding weirdness on
              // this component
              css={{ marginBottom: -5 }}
              size={TextAreaSize.SMALL}
              grows
              placeholder={messages.description}
              defaultValue={bio || ''}
              onChange={(e) => onUpdateBio(e.target.value)}
            />

            {/* @ts-ignore */}
            <Input
              css={{
                '& > input': {
                  paddingLeft: spacing.s
                }
              }}
              characterLimit={30}
              size='small'
              placeholder={messages.location}
              defaultValue={location || ''}
              onChange={onUpdateLocation}
            />
          </Flex>

          <Flex column gap='s'>
            <Text variant='title' color='white'>
              {messages.socialHandles}
            </Text>
            <SocialLinkInput
              defaultValue={twitterHandle}
              isDisabled={!!twitterVerified}
              type={Type.X}
              onChange={onUpdateTwitterHandle}
            />
            <SocialLinkInput
              defaultValue={instagramHandle}
              isDisabled={!!instagramVerified}
              type={Type.INSTAGRAM}
              onChange={onUpdateInstagramHandle}
            />
            <SocialLinkInput
              defaultValue={tikTokHandle}
              isDisabled={!!tikTokVerified}
              type={Type.TIKTOK}
              onChange={onUpdateTikTokHandle}
            />
          </Flex>

          <Flex column gap='s'>
            <Text variant='title' color='white'>
              {messages.fanClubFlair}
            </Text>
            <FanClubFlairInput
              selectedBadge={fanClubBadge}
              onChange={onUpdateFanClubBadge}
            />
          </Flex>

          <Flex column gap='s'>
            <Text variant='title' color='white'>
              {messages.website}
            </Text>
            <SocialLinkInput
              defaultValue={website}
              type={Type.WEBSITE}
              onChange={onUpdateWebsite}
            />
          </Flex>
        </Flex>
      </Box>
    )
  } else if (userId && !loading && !isDeactivated) {
    const showUploadChip = isOwner && !isArtist
    return (
      <Flex
        column
        gap='2xl'
        w={PROFILE_LEFT_COLUMN_WIDTH_PX}
        css={{
          flexShrink: 0,
          textAlign: 'left',
          zIndex: zIndex.PROFILE_EDITABLE_COMPONENTS
        }}
      >
        <ProfileBio
          userId={userId}
          handle={handle}
          bio={bio}
          location={location}
          website={website}
          created={created}
          twitterHandle={twitterHandle}
          instagramHandle={instagramHandle}
          tikTokHandle={tikTokHandle}
        />

        {/* For fan club owners, replace the tip CTA with their coin */}
        {showFanClubCTA ? <BuyFanClubCard mint={ownedCoin.mint} /> : null}
        <RecentComments userId={userId} />
        <ProfileMutuals />
        <RelatedArtists />
        {isArtist ? <ProfileTopTags /> : null}
        {showUploadChip ? (
          <UploadChip type='track' variant='nav' source='nav' />
        ) : null}
      </Flex>
    )
  } else {
    return null
  }
}
