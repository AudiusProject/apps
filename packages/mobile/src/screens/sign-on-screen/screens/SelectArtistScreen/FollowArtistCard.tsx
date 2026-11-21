import type { ChangeEvent } from 'react'
import { useCallback, useContext } from 'react'

import { Name, type UserMetadata } from '@audius/common/models'
import { formatCount } from '@audius/common/utils'
import {
  addFollowArtists,
  removeFollowArtists
} from '@audius/web/src/common/store/pages/signon/actions'
import { getFollowIds } from '@audius/web/src/common/store/pages/signon/selectors'
import type { AppState } from '@audius/web/src/store/types'
import { css } from '@emotion/native'
import LottieView from 'lottie-react-native'
import { Pressable } from 'react-native'
import { useDispatch, useSelector } from 'react-redux'

import type { IconComponent } from '@audius/harmony-native'
import {
  Box,
  Divider,
  Flex,
  FollowButton,
  IconNote,
  IconPause,
  IconPlay,
  IconUser,
  Paper,
  RadialGradient,
  SoundwaveCircle,
  Text,
  useTheme
} from '@audius/harmony-native'
import {
  ProfilePicture,
  UserCoverPhoto,
  UserDisplayName
} from 'app/components/core'
import { StaticSkeleton } from 'app/components/skeleton'
import { make, track } from 'app/services/analytics'
import { EventNames } from 'app/types/analytics'

import { SelectArtistsPreviewContext } from './selectArtistPreviewContext'

type FollowArtistCardProps = {
  artist: UserMetadata
  showPreviewHint?: boolean
}

export const FollowArtistCard = (props: FollowArtistCardProps) => {
  const { artist, showPreviewHint } = props
  const { user_id, track_count, follower_count } = artist
  const { spacing } = useTheme()
  const dispatch = useDispatch()

  const isFollowing = useSelector((state: AppState) =>
    getFollowIds(state).includes(artist.user_id)
  )

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const { value, checked } = e.target
      const artistId = parseInt(value)
      if (checked) {
        track(
          make({
            eventName: Name.CREATE_ACCOUNT_FOLLOW_ARTIST,
            artistName: artist.name,
            artistID: artistId
          })
        )
        dispatch(addFollowArtists([artistId]))
      } else {
        dispatch(removeFollowArtists([artistId]))
      }
    },
    [artist.name, dispatch]
  )

  const {
    hasPlayed,
    isPlaying,
    nowPlayingArtistId,
    togglePreview,
    playPreview
  } = useContext(SelectArtistsPreviewContext)

  const isPreviewing = nowPlayingArtistId === user_id

  const handlePress = useCallback(() => {
    if (isPreviewing) {
      togglePreview()
    } else {
      track(
        make({
          eventName: EventNames.CREATE_ACCOUNT_ARTIST_PREVIEWED,
          artistID: user_id,
          artistName: artist.name
        })
      )
      playPreview(user_id)
    }
  }, [artist.name, isPreviewing, playPreview, togglePreview, user_id])

  const renderPreviewElement = () => {
    let PreviewIcon: IconComponent | null = null

    if (showPreviewHint && !hasPlayed) {
      PreviewIcon = IconPlay
    } else if (isPreviewing && isPlaying) {
      PreviewIcon = IconPause
    } else if (isPreviewing && !isPlaying) {
      PreviewIcon = IconPlay
    }

    if (!PreviewIcon) return null

    return (
      <RadialGradient
        style={css({
          alignItems: 'center',
          justifyContent: 'center'
        })}
        colors={['rgba(0, 0, 0, 0.50)', 'rgba(0, 0, 0, 0.10)']}
        stops={[0, 1]}
        center={[50, 50]}
        radius={50}
      >
        <PreviewIcon size='l' color='white' shadow='drop' />
      </RadialGradient>
    )
  }

  return (
    <Paper>
      <Pressable onPress={handlePress}>
        <UserCoverPhoto
          userId={user_id}
          style={css({ height: 68 })}
          topCornerRadius='m'
        >
          {isPreviewing && isPlaying ? (
            <Box
              h='xl'
              w='xl'
              style={css({
                opacity: 0.6,
                position: 'absolute',
                right: spacing.s,
                top: spacing.s
              })}
            >
              <LottieView
                style={css({ height: '100%', width: '100%' })}
                source={SoundwaveCircle}
                autoPlay
              />
            </Box>
          ) : null}
        </UserCoverPhoto>
      </Pressable>
      <Flex
        alignItems='center'
        pointerEvents='box-none'
        style={css({
          position: 'absolute',
          top: spacing['2xl'],
          left: 0,
          right: 0,
          zIndex: 1
        })}
      >
        <Pressable onPress={handlePress}>
          <ProfilePicture userId={user_id} variant='strong' size='large'>
            {renderPreviewElement()}
          </ProfilePicture>
        </Pressable>
      </Flex>
      <Flex pt='unit12' ph='s' pb='l' alignItems='center' gap='l'>
        <Flex gap='s' alignItems='center'>
          <UserDisplayName userId={user_id} />
          <Flex direction='row' gap='s' alignItems='center'>
            <Flex direction='row' gap='xs' alignItems='center'>
              <IconNote size='s' color='subdued' />
              <Text variant='body' size='s' strength='strong'>
                {formatCount(track_count)}
              </Text>
            </Flex>
            <Divider orientation='vertical' />
            <Flex direction='row' gap='xs' alignItems='center'>
              <IconUser size='s' color='subdued' />
              <Text variant='body' size='s' strength='strong'>
                {formatCount(follower_count)}
              </Text>
            </Flex>
          </Flex>
        </Flex>
        <Box w='100%'>
          <FollowButton
            variant='pill'
            size='small'
            value={user_id.toString()}
            onChange={handleChange}
            isFollowing={isFollowing}
          />
        </Box>
      </Flex>
    </Paper>
  )
}

export const FollowArtistTileSkeleton = () => {
  return (
    <Paper h={220} direction='column' ph='m' pb='l'>
      <Flex
        direction='column'
        gap='s'
        style={{ marginTop: 34 }}
        alignItems='center'
        flex={1}
      >
        <StaticSkeleton
          height={72}
          width={72}
          style={css({ borderRadius: 36 })}
        />
        <StaticSkeleton height={16} width={150} />
        <StaticSkeleton height={20} width={100} />
      </Flex>
      <StaticSkeleton
        height={32}
        width='100%'
        style={css({ borderRadius: 16 })}
      />
    </Paper>
  )
}
