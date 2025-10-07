import { HTMLProps, useContext } from 'react'

import { Name, WidthSizes, UserMetadata } from '@audius/common/models'
import { formatCount } from '@audius/common/utils'
import {
  Box,
  Divider,
  Flex,
  FollowButton,
  IconNote,
  IconPause,
  IconPlay,
  IconUser,
  IconVerified,
  Paper,
  SoundwaveCircle,
  Text,
  useTheme
} from '@audius/harmony'
import { useField } from 'formik'
import Lottie from 'lottie-react'
import { useDispatch } from 'react-redux'
import { useHover } from 'react-use'

import { make } from 'common/store/analytics/actions'
import { Avatar } from 'components/avatar/Avatar'
import Skeleton from 'components/skeleton/Skeleton'
import { useCoverPhoto } from 'hooks/useCoverPhoto'
import { useMedia } from 'hooks/useMedia'

import { SelectArtistsPreviewContext } from './selectArtistsPreviewContext'

type FollowArtistTileProps = {
  user: UserMetadata
  mobileWidth?: string
} & HTMLProps<HTMLInputElement>

export const FollowArtistCard = (props: FollowArtistTileProps) => {
  const {
    user: { name, user_id, is_verified, track_count, follower_count },
    mobileWidth = 'calc(50% - 4px)'
  } = props
  const dispatch = useDispatch()
  const { isMobile } = useMedia()
  const { image: coverPhoto, shouldBlur } = useCoverPhoto({
    userId: user_id,
    size: WidthSizes.SIZE_640
  })
  const [followField] = useField({ name: 'selectedArtists', type: 'checkbox' })
  const { spacing } = useTheme()

  const {
    togglePreview,
    nowPlayingArtistId,
    isPlaying: isPreviewPlaying
  } = useContext(SelectArtistsPreviewContext)

  const isPlaying = isPreviewPlaying && nowPlayingArtistId === user_id
  const hasTracks = track_count && track_count > 0

  const [avatar] = useHover((isHovered) => (
    <Box w={72} h={72} css={{ position: 'absolute', top: 34 }}>
      <Flex
        h={74}
        w={74}
        justifyContent='center'
        alignItems='center'
        css={{
          visibility:
            (isHovered || isPlaying) && hasTracks ? 'visible' : 'hidden',
          pointerEvents: 'none',
          position: 'absolute',
          top: 0,
          left: 0,
          borderRadius: 100,
          opacity: 0.75,
          background:
            'radial-gradient(50% 50% at 50% 50%, rgba(0, 0, 0, 0.50) 0%, rgba(0, 0, 0, 0.10) 100%)',
          zIndex: 2
        }}
      >
        {hasTracks ? (
          isPlaying ? (
            <IconPause size='l' color='white' />
          ) : (
            <Box pl='xs'>
              <IconPlay size='l' color='white' />
            </Box>
          )
        ) : null}
      </Flex>
      <Avatar
        variant='strong'
        userId={user_id}
        css={{ cursor: hasTracks ? 'pointer' : 'default' }}
        onClick={() => {
          dispatch(
            make(Name.CREATE_ACCOUNT_ARTIST_PREVIEWED, {
              artistName: name,
              artistID: user_id
            })
          )
          if (hasTracks) {
            togglePreview(user_id)
          }
        }}
      />
    </Box>
  ))

  return (
    <Paper h={220} w={isMobile ? mobileWidth : 235}>
      <Flex w='100%' direction='column' alignItems='center'>
        {isPlaying ? (
          <Box
            h='xl'
            w='xl'
            css={{
              opacity: '60%',
              position: 'absolute',
              right: spacing.s,
              top: spacing.s,
              zIndex: 1
            }}
          >
            <Lottie loop autoplay animationData={SoundwaveCircle} />
          </Box>
        ) : null}
        {avatar}
        <Box
          w='100%'
          h={68}
          css={{
            backgroundImage: `url(${coverPhoto})`,
            backgroundSize: 'cover',
            '&:before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              height: '100%',
              width: '100%',
              borderRadius: '8px',
              overflow: 'hidden',
              ...(shouldBlur
                ? {
                    backdropFilter: 'blur(25px)'
                  }
                : undefined)
            },
            overflow: 'hidden'
          }}
        />
        <Flex
          direction='column'
          alignItems='center'
          gap='l'
          pt='3xl'
          pb='l'
          ph='s'
          w='100%'
        >
          <Flex direction='column' alignItems='center' gap='s'>
            <Flex direction='row' gap='xs' alignItems='center'>
              <Text
                variant='title'
                size='s'
                strength='default'
                css={{
                  // TODO: Need to contain width
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                {name}
              </Text>
              {is_verified ? (
                <IconVerified css={{ width: 12, height: 12 }} />
              ) : null}
            </Flex>
            <Flex direction='row' gap='s' alignItems='center'>
              <Flex direction='row' gap='xs' alignItems='center'>
                <IconNote width={16} height={16} color='subdued' />
                <Text variant='body' size='s' strength='strong'>
                  {formatCount(track_count)}
                </Text>
              </Flex>
              <Divider orientation='vertical' />
              <Flex direction='row' gap='xs' alignItems='center'>
                <IconUser width={16} height={16} color='subdued' />
                <Text variant='body' size='s' strength='strong'>
                  {formatCount(follower_count)}
                </Text>
              </Flex>
            </Flex>
          </Flex>
          <FollowButton
            variant='pill'
            type='checkbox'
            size={isMobile ? 'small' : 'default'}
            {...followField}
            isFollowing={followField.value.includes(user_id.toString())}
            value={user_id}
            onClick={(e) => {
              if ((e.target as HTMLInputElement).checked) {
                dispatch(
                  make(Name.CREATE_ACCOUNT_FOLLOW_ARTIST, {
                    artistName: name,
                    artistID: user_id
                  })
                )
              }
            }}
          />
        </Flex>
      </Flex>
    </Paper>
  )
}

export const FollowArtistTileSkeleton = () => {
  const { isMobile } = useMedia()

  return (
    <Paper
      h={220}
      w={isMobile ? 'calc(50% - 4px)' : 235}
      direction='column'
      ph='m'
      pb='l'
    >
      <Flex
        direction='column'
        gap='s'
        css={{ marginTop: 34 }}
        alignItems='center'
        flex={1}
      >
        <Skeleton
          height='72px'
          width='72px'
          css={{
            borderRadius: '36px !important'
          }}
        />
        <Skeleton height='16px' width='150px' />
        <Skeleton height='20px' width='100px' />
      </Flex>
      <Skeleton
        height='32px'
        width='100%'
        css={{ borderRadius: '16px !important' }}
      />
    </Paper>
  )
}
