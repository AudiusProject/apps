import type { User } from '@audius/common/models'
import BadgeArtist from '@audius/harmony/src/assets/icons/ArtistBadge.svg'
import { Box } from '@audius/harmony/src/components/layout/Box'
import { Flex } from '@audius/harmony/src/components/layout/Flex'
import { Text } from '@audius/harmony/src/components/text'

const messages = {
  tracks: 'Tracks',
  playlists: 'Playlists',
  followers: 'Followers',
  following: 'Following'
}

type DesktopServerProfilePageProps = {
  user: User
}

export const DesktopServerProfilePage = ({
  user
}: DesktopServerProfilePageProps) => {
  const {
    cover_photo,
    handle,
    name,
    profile_picture,
    track_count,
    followee_count,
    follower_count,
    playlist_count
  } = user

  const isArtist = track_count > 0

  // Use profile picture with blur as fallback if cover photo is not available
  const coverPhotoUrl =
    cover_photo?.['2000x'] ?? profile_picture?.['1000x1000'] ?? null
  const useBlurFallback = !cover_photo?.['2000x'] && profile_picture

  return (
    <Flex w='100%' direction='column' css={{ overflow: 'hidden' }}>
      {coverPhotoUrl ? (
        <Box
          as='img'
          // @ts-ignore
          src={coverPhotoUrl}
          w='100%'
          h={376}
          css={{
            objectFit: 'cover',
            filter: useBlurFallback ? 'blur(40px)' : undefined,
            transform: useBlurFallback ? 'scale(1.1)' : undefined,
            position: 'relative'
          }}
        />
      ) : (
        <Box w='100%' h={376} backgroundColor='surface1' />
      )}
      <Box
        w='100%'
        ph='l'
        css={{
          zIndex: 10,
          position: 'absolute',
          margin: '0 auto',
          top: 264,
          left: 0,
          right: 0,
          maxWidth: 992
        }}
      >
        <Flex>
          <Box
            h={208}
            w={208}
            borderRadius='circle'
            css={{
              boxShadow: '0 2px 6px -2px #0d101280'
            }}
          >
            <Box
              h='100%'
              w='100%'
              as='img'
              // @ts-ignore
              src={profile_picture['480x480']}
              css={{ border: '4px solid var(--harmony-n-25)' }}
              borderRadius='circle'
            />
          </Box>
          <Box
            w='100%'
            mt='xs'
            ml='2xl'
            css={{
              position: 'relative',
              textAlign: 'left',
              userSelect: 'none',
              maxWidth: 720
            }}
          >
            <BadgeArtist
              css={{
                fill: 'white',
                filter: 'drop-shadow(0 1px 4px rgba(0, 0, 0, 0.3))',
                visibility: isArtist ? 'visible' : 'hidden'
              }}
            />
            <Text
              variant='display'
              size='s'
              strength='strong'
              color='white'
              css={{ letterSpacing: 0.5 }}
            >
              {name}
            </Text>
            <Text variant='body' color='white' strength='strong'>
              @{handle}
            </Text>
          </Box>
        </Flex>
      </Box>

      {/* Stat Banner */}
      <Flex
        h={56}
        w='100%'
        justifyContent='center'
        alignItems='center'
        backgroundColor='surface1'
        borderBottom='default'
      >
        <Flex
          justifyContent='space-between'
          w={756}
          css={{
            marginLeft: 233,
            paddingLeft: 30,
            paddingRight: 16
          }}
        >
          <Flex justifyContent='space-between' alignItems='center' w={330}>
            <Flex
              direction='column'
              justifyContent='center'
              alignItems='center'
              gap='xs'
            >
              <Text
                variant='label'
                strength='strong'
                color='default'
                css={{ fontSize: 22, lineHeight: '22px' }}
              >
                {isArtist ? track_count : playlist_count}
              </Text>
              <Text
                variant='label'
                size='s'
                strength='strong'
                color='subdued'
                css={{ letterSpacing: 0.75 }}
              >
                {isArtist ? messages.tracks : messages.playlists}
              </Text>
            </Flex>
            <Flex
              direction='column'
              justifyContent='center'
              alignItems='center'
              gap='xs'
            >
              <Text
                variant='label'
                strength='strong'
                color='default'
                css={{ fontSize: 22, lineHeight: '22px' }}
              >
                {follower_count}
              </Text>
              <Text
                variant='label'
                size='s'
                strength='strong'
                color='subdued'
                css={{ letterSpacing: 0.75 }}
              >
                {messages.followers}
              </Text>
            </Flex>
            <Flex
              direction='column'
              justifyContent='center'
              alignItems='center'
              gap='xs'
            >
              <Text
                variant='label'
                strength='strong'
                color='default'
                css={{ fontSize: 22, lineHeight: '22px' }}
              >
                {followee_count}
              </Text>
              <Text
                variant='label'
                size='s'
                strength='strong'
                color='subdued'
                css={{ letterSpacing: 0.75 }}
              >
                {messages.following}
              </Text>
            </Flex>
          </Flex>
        </Flex>
      </Flex>

      {/* Nav Banner */}
      <Flex h={48} w='100%' backgroundColor='surface1' />
    </Flex>
  )
}
