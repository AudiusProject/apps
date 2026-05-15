import { Fragment, useCallback, useState } from 'react'

import { useRelatedArtistsUsers, useProfileUser } from '@audius/common/api'
import { FollowSource } from '@audius/common/models'
import type { User } from '@audius/common/models'
import { usersSocialActions } from '@audius/common/store'
import { css } from '@emotion/native'
import { isEmpty } from 'lodash'
import { TouchableOpacity } from 'react-native'
import { useDispatch } from 'react-redux'

import {
  IconClose,
  useTheme,
  IconButton,
  Flex,
  Text,
  FollowButton
} from '@audius/harmony-native'
import { ProfilePicture } from 'app/components/core'
import { UserLink } from 'app/components/user-link'
import { useNavigation } from 'app/hooks/useNavigation'

const { followUser, unfollowUser } = usersSocialActions

const messages = {
  description: 'Here are some accounts that vibe well with',
  follow: 'Follow All',
  unfollow: 'Unfollow All',
  following: 'Following All',
  closeLabel: 'Close'
}

type ArtistRecommendationsProps = {
  onClose: () => void
}

export const ArtistRecommendations = (props: ArtistRecommendationsProps) => {
  const { onClose } = props
  const { spacing } = useTheme()
  const navigation = useNavigation()
  const { user_id, name } =
    useProfileUser({
      select: (user) => ({ user_id: user.user_id, name: user.name })
    }).user ?? {}
  const dispatch = useDispatch()
  const [hasFollowedAll, setHasFollowedAll] = useState(false)

  const { data: suggestedArtists = [], isPending } = useRelatedArtistsUsers({
    artistId: user_id,
    filterFollowed: true,
    pageSize: 7
  })

  const handlePressFollow = useCallback(() => {
    suggestedArtists.forEach((artist) => {
      dispatch(followUser(artist.user_id, FollowSource.USER_LIST))
    })
    setHasFollowedAll(true)
  }, [suggestedArtists, dispatch])

  const handlePressUnfollow = useCallback(() => {
    suggestedArtists.forEach((artist) => {
      dispatch(unfollowUser(artist.user_id, FollowSource.USER_LIST))
    })
    setHasFollowedAll(false)
  }, [suggestedArtists, dispatch])

  const handlePressArtist = useCallback(
    (artist: User) => () => {
      navigation.push('Profile', { handle: artist.handle })
    },
    [navigation]
  )

  const suggestedArtistNames = suggestedArtists.slice(0, 3)

  if (isEmpty(suggestedArtists)) {
    return null
  }

  return (
    <Flex gap='s' pb='m'>
      <Flex row alignItems='center' gap='s'>
        <IconButton
          icon={IconClose}
          color='subdued'
          aria-label={messages.closeLabel}
          size='s'
          onPress={onClose}
        />
        <Text textAlign='center' size='s'>
          {messages.description} {name}
        </Text>
      </Flex>
      <Flex row justifyContent='center'>
        {suggestedArtists.map((artist) => (
          <TouchableOpacity
            onPress={handlePressArtist(artist)}
            key={artist.user_id}
          >
            <ProfilePicture
              userId={artist.user_id}
              style={css({
                height: spacing.unit13,
                width: spacing.unit13,
                marginRight: -spacing.m
              })}
              borderWidth='thin'
            />
          </TouchableOpacity>
        ))}
      </Flex>
      <Text>
        Featuring{' '}
        {suggestedArtistNames.map((artist) => (
          <Fragment key={artist.user_id}>
            <UserLink variant='visible' userId={artist.user_id} />
            <Text>, </Text>
          </Fragment>
        ))}
        <Text>{`and ${
          suggestedArtists.length - suggestedArtistNames.length
        } others`}</Text>
      </Text>
      <FollowButton
        isFollowing={hasFollowedAll}
        onFollow={handlePressFollow}
        onUnfollow={handlePressUnfollow}
        disabled={isPending}
        messages={messages}
      />
    </Flex>
  )
}
