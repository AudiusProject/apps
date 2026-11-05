import { useCallback } from 'react'

import { useCurrentUserId, useUser } from '@audius/common/api'
import type { ID } from '@audius/common/models'
import { FollowSource } from '@audius/common/models'
import { formatCount } from '@audius/common/utils'
import { pick } from 'lodash'
import { Animated, Pressable } from 'react-native'

import { Text, Flex } from '@audius/harmony-native'
import { ProfilePicture } from 'app/components/core'
import { FollowButton } from 'app/components/user'
import { UserLink } from 'app/components/user-link'
import { useNavigation } from 'app/hooks/useNavigation'
import { useColorAnimation } from 'app/hooks/usePressColorAnimation'
import { useThemeColors } from 'app/utils/theme'

import { USER_LIST_AVATAR_SIZE } from './constants'

const messages = {
  followsYou: 'Follows you',
  followers: (followerCount: number) =>
    `${formatCount(followerCount)} ${
      followerCount === 1 ? 'follower' : 'followers'
    }`
}

type UserListItemProps = {
  tag: string
  userId: ID
  showRank?: boolean
  rank?: number
  renderRightContent?: (userId: ID, index: number) => React.ReactNode
  hideFollowsYou?: boolean
}

/**
 * One compact row: avatar, name, handle with "Follows you" or the follower
 * count, follow button.
 */
export const UserListItem = (props: UserListItemProps) => {
  const { userId, showRank, rank, renderRightContent, hideFollowsYou } = props
  const { data: user } = useUser(userId, {
    select: (user) =>
      pick(user, ['handle', 'follower_count', 'does_follow_current_user'])
  })
  const {
    handle,
    follower_count = 0,
    does_follow_current_user: followsYou
  } = user ?? {}
  const { data: currentUserId } = useCurrentUserId()
  const navigation = useNavigation()
  const { white, neutralLight10 } = useThemeColors()
  const { color, handlePressIn, handlePressOut } = useColorAnimation(
    white,
    neutralLight10
  )

  const handlePress = useCallback(() => {
    navigation.push('Profile', { handle })
  }, [navigation, handle])

  return (
    <Animated.View style={{ backgroundColor: color }}>
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <Flex row alignItems='center' gap='m' ph='l' pv='m'>
          {showRank && rank ? (
            <Text
              size='m'
              strength='strong'
              color='subdued'
              style={{ minWidth: 24 }}
            >
              {rank}
            </Text>
          ) : null}
          <ProfilePicture
            userId={userId}
            size='auto'
            w={USER_LIST_AVATAR_SIZE}
            h={USER_LIST_AVATAR_SIZE}
          />
          <Flex flex={1} gap='2xs'>
            <UserLink userId={userId} strength='strong' />
            <Text size='s' color='subdued' numberOfLines={1}>
              @{handle} ·{' '}
              {followsYou && !hideFollowsYou
                ? messages.followsYou
                : messages.followers(follower_count)}
            </Text>
          </Flex>
          {renderRightContent ? (
            renderRightContent(userId, rank ? rank - 1 : 0)
          ) : currentUserId !== userId ? (
            <FollowButton
              variant='pill'
              size='small'
              userId={userId}
              followSource={FollowSource.USER_LIST}
            />
          ) : null}
        </Flex>
      </Pressable>
    </Animated.View>
  )
}
