import { useCallback } from 'react'

import { useCurrentUserId, useUser } from '@audius/common/api'
import type { ID } from '@audius/common/models'
import { FollowSource } from '@audius/common/models'
import { formatCount } from '@audius/common/utils'
import { pick } from 'lodash'
import { Animated, Pressable } from 'react-native'

import { Text, IconUser, Flex } from '@audius/harmony-native'
import { ProfilePicture } from 'app/components/core'
import { FollowButton, FollowsYouBadge } from 'app/components/user'
import { UserLink } from 'app/components/user-link'
import { useNavigation } from 'app/hooks/useNavigation'
import { useColorAnimation } from 'app/hooks/usePressColorAnimation'
import { makeStyles } from 'app/styles'
import { useThemeColors } from 'app/utils/theme'

const messages = {
  followers: (followerCount: number) =>
    followerCount === 1 ? 'Follower' : 'Followers'
}

const useStyles = makeStyles(({ spacing }) => ({
  root: {
    padding: spacing(4),
    gap: spacing(4)
  }
}))

type UserListItemProps = {
  tag: string
  userId: ID
  // Add optional rank display
  showRank?: boolean
  rank?: number
  // Add optional right content renderer
  renderRightContent?: (userId: ID, index: number) => React.ReactNode
}

export const UserListItem = (props: UserListItemProps) => {
  const { userId, showRank, rank, renderRightContent } = props
  const { data: user } = useUser(userId, {
    select: (user) => pick(user, ['handle', 'follower_count'])
  })
  const { handle, follower_count = 0 } = user ?? {}
  const { data: currentUserId } = useCurrentUserId()
  const styles = useStyles()
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
        style={styles.root}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <Flex row gap='s' alignItems='center'>
          {showRank && rank && (
            <Text size='l' strength='strong' style={{ minWidth: 30 }}>
              {rank}
            </Text>
          )}
          <ProfilePicture userId={userId} size='large' />
          <Flex gap='s' flex={1}>
            <Flex>
              <UserLink userId={userId} strength='strong' />
              <Text size='s'>@{handle}</Text>
            </Flex>
            <Flex
              row
              justifyContent='space-between'
              alignItems='center'
              gap='l'
            >
              <Flex row gap='xs' alignItems='center'>
                <IconUser color='subdued' size='s' />
                <Text size='s' color='subdued'>
                  <Text strength='strong' color='inherit'>
                    {formatCount(follower_count)}
                  </Text>{' '}
                  {messages.followers(follower_count)}
                </Text>
              </Flex>
              <FollowsYouBadge userId={userId} />
            </Flex>
          </Flex>
          {renderRightContent && (
            <Flex alignItems='center'>
              {renderRightContent(userId, rank ? rank - 1 : 0)}
            </Flex>
          )}
        </Flex>
        {currentUserId !== userId && !renderRightContent ? (
          <FollowButton
            variant='pill'
            userId={userId}
            followSource={FollowSource.USER_LIST}
          />
        ) : null}
      </Pressable>
    </Animated.View>
  )
}
