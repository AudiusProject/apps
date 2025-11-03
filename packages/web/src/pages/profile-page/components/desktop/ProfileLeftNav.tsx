import { useArtistCreatedCoin } from '@audius/common/api'
import { useFeatureFlag } from '@audius/common/hooks'
import { ID } from '@audius/common/models'
import { FeatureFlags } from '@audius/common/services'
import { Nullable } from '@audius/common/utils'
import { Box, Flex, Text } from '@audius/harmony'

import Input from 'components/data-entry/Input'
import TextArea from 'components/data-entry/TextArea'
import { TipAudioButton } from 'components/tipping/tip-audio/TipAudioButton'
import UploadChip from 'components/upload/UploadChip'
import { Type } from 'pages/profile-page/components/SocialLink'
import { ProfileTopTags } from 'pages/profile-page/components/desktop/ProfileTopTags'
import { zIndex } from 'utils/zIndex'

import { ArtistCoinFlairInput } from '../ArtistCoinFlairInput'
import SocialLinkInput from '../SocialLinkInput'

import { BuyArtistCoinCard } from './BuyArtistCoinCard'
import { ProfileBio } from './ProfileBio'
import { ProfileMutuals } from './ProfileMutuals'
import { RecentComments } from './RecentComments'
import { RelatedArtists } from './RelatedArtists'
import { SupportingList } from './SupportingList'
import { TopSupporters } from './TopSupporters'
import { PROFILE_LEFT_COLUMN_WIDTH_PX } from './constants'

const messages = {
  aboutYou: 'About You',
  description: 'Description',
  location: 'Location',
  socialHandles: 'Social Handles',
  artistCoinFlair: 'Artist Coin Flair',
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
  artistCoinBadge?: Nullable<{
    mint: string
    logo_uri: string
    ticker: string
  }>
  onUpdateArtistCoinBadge: (
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
    artistCoinBadge,
    onUpdateArtistCoinBadge,
    twitterVerified,
    instagramVerified,
    tikTokVerified,
    isOwner
  } = props

  const { data: ownedCoin, isPending: isArtistCoinLoading } =
    useArtistCreatedCoin(userId)

  const recentCommentsFlag = useFeatureFlag(FeatureFlags.RECENT_COMMENTS)
  const isRecentCommentsEnabled =
    recentCommentsFlag.isLoaded && recentCommentsFlag.isEnabled
  const showArtistCoinCTA = !isArtistCoinLoading && !!ownedCoin

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
              size='small'
              grows
              placeholder={messages.description}
              defaultValue={bio || ''}
              onChange={onUpdateBio}
            />
            <Input
              css={(theme) => ({
                '& > input': {
                  paddingLeft: theme.spacing.s
                }
              })}
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
              {messages.artistCoinFlair}
            </Text>
            <ArtistCoinFlairInput
              selectedBadge={artistCoinBadge}
              onChange={onUpdateArtistCoinBadge}
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

        {/* For artist coin owners, replace the tip CTA with their coin */}
        {showArtistCoinCTA ? (
          <BuyArtistCoinCard mint={ownedCoin.mint} />
        ) : !isArtistCoinLoading && !isOwner ? (
          <TipAudioButton />
        ) : null}
        {isRecentCommentsEnabled ? <RecentComments userId={userId} /> : null}
        <SupportingList />
        <TopSupporters />
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
