import type { User } from '@audius/common/models'
import { formatCount } from '@audius/common/src/utils/decimal'
import BadgeArtist from '@audius/harmony/src/assets/icons/ArtistBadge.svg'
import IconLink from '@audius/harmony/src/assets/icons/Link.svg'
import { Box } from '@audius/harmony/src/components/layout/Box'
import { Flex } from '@audius/harmony/src/components/layout/Flex'
import { Text } from '@audius/harmony/src/components/text'

import { ServerUserGeneratedText } from 'components/user-generated-text/ServerUserGeneratedText'

const messages = {
  tracks: 'Tracks',
  followers: 'Followers',
  following: 'Following',
  playlists: 'Playlists',
  showMore: 'Show More',
  showLess: 'Show Less',
  editProfile: 'Edit Profile',
  profilePicAltText: 'User Profile Picture'
}

type MobileServerProfilePageProps = {
  user: User
}

export const MobileServerProfilePage = ({
  user
}: MobileServerProfilePageProps) => {
  const {
    bio,
    name,
    handle,
    cover_photo,
    profile_picture,
    track_count,
    playlist_count,
    follower_count,
    followee_count,
    website
  } = user

  const isArtist = track_count > 0
  const hasEllipsis = website
  const isDescriptionMinimized = true

  // Use profile picture with blur as fallback if cover photo is not available
  const coverPhotoUrl =
    cover_photo?.['2000x'] ?? profile_picture?.['1000x1000'] ?? null
  const useBlurFallback = !cover_photo?.['2000x'] && profile_picture

  return (
    <Flex direction='column' backgroundColor='default'>
      <Flex
        w='100%'
        h={96}
        direction='column'
        justifyContent='center'
        alignItems='center'
        css={{ overflow: 'hidden' }}
      >
        {coverPhotoUrl ? (
          <Box
            as='img'
            // @ts-ignore
            src={coverPhotoUrl}
            w='100%'
            css={{
              filter: useBlurFallback ? 'blur(20px)' : undefined,
              transform: useBlurFallback ? 'scale(1.1)' : undefined
            }}
          />
        ) : (
          <Box w='100%' h={96} backgroundColor='surface1' />
        )}
        {isArtist && !user.is_deactivated ? (
          <BadgeArtist
            css={{
              position: 'absolute',
              top: 21,
              right: 13,
              fill: 'white',
              boxShadow: '0 1px 4px 0 rgba(0, 0, 0, 0.3)'
            }}
          />
        ) : null}
      </Flex>
      <Flex
        alignItems='center'
        justifyContent='center'
        h={82}
        w={82}
        borderRadius='circle'
        backgroundColor='white'
        css={{
          zIndex: 10,
          position: 'absolute',
          top: 37,
          left: 11,
          boxSizing: 'border-box',
          border: '2px solid var(--harmony-white)',
          overflow: 'hidden'
        }}
      >
        <Box
          as='img'
          // @ts-ignore
          src={profile_picture!}
          h='100%'
          w='100%'
          borderRadius='m'
        />
      </Flex>
      <Flex
        inline
        direction='column'
        p='m'
        backgroundColor='surface1'
        css={{ paddingTop: 30, zIndex: 5 }}
      >
        <Flex justifyContent='space-between'>
          <Flex direction='column' gap='xs'>
            <Flex>
              <Text
                color='default'
                variant='title'
                size='l'
                css={{ lineHeight: '22px' }}
              >
                {name}
              </Text>
            </Flex>
            <Box css={{ textAlign: 'left', marginBottom: 14 }}>
              <Text
                variant='body'
                size='s'
                color='subdued'
                css={{ lineHeight: 'normal' }}
              >
                @{handle}
              </Text>
            </Box>
          </Flex>
        </Flex>

        <Flex inline justifyContent='flex-start' w='100%' mb='s' gap='l'>
          <Flex css={{ gap: 3 }}>
            <Text
              color='default'
              variant='title'
              size='s'
              strength='strong'
              css={{ lineHeight: 'normal' }}
            >
              {formatCount(isArtist ? track_count : playlist_count)}
            </Text>
            <Text
              color='subdued'
              variant='title'
              size='s'
              strength='weak'
              css={{ lineHeight: 'normal' }}
            >
              {isArtist ? messages.tracks : messages.playlists}
            </Text>
          </Flex>
          <Flex css={{ gap: 3 }}>
            <Text
              color='default'
              variant='title'
              size='s'
              strength='strong'
              css={{ lineHeight: 'normal' }}
            >
              {formatCount(follower_count)}
            </Text>
            <Text
              color='subdued'
              variant='title'
              size='s'
              strength='weak'
              css={{ lineHeight: 'normal' }}
            >
              {messages.followers}
            </Text>
          </Flex>
          <Flex css={{ gap: 3 }}>
            <Text
              color='default'
              variant='title'
              size='s'
              strength='strong'
              css={{ lineHeight: 'normal' }}
            >
              {formatCount(followee_count)}
            </Text>
            <Text
              color='subdued'
              variant='title'
              size='s'
              strength='weak'
              css={{ lineHeight: 'normal' }}
            >
              {messages.following}
            </Text>
          </Flex>
        </Flex>
        {bio ? (
          <ServerUserGeneratedText
            color='subdued'
            size='s'
            css={{
              display: '-webkit-box',
              width: '100%',
              marginTop: 8,
              maxHeight: 40,
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              textAlign: 'left'
            }}
          >
            {bio}
          </ServerUserGeneratedText>
        ) : null}
        {hasEllipsis && !isDescriptionMinimized ? (
          <Flex direction='column' mb='s'>
            {website ? (
              <Flex
                justifyContent='flex-start'
                gap='m'
                mt='m'
                css={{ lineHeight: '19px' }}
              >
                <IconLink size='m' color='default' />
                <span>{website}</span>
              </Flex>
            ) : null}
          </Flex>
        ) : null}
      </Flex>
    </Flex>
  )
}
