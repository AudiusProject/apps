import { useCallback } from 'react'

import { useUser } from '@audius/common/api'
import type { ID, User } from '@audius/common/models'
import { FollowSource } from '@audius/common/models'
import { accountSelectors } from '@audius/common/store'
import { formatCount } from '@audius/common/utils'
import { pick } from 'lodash'
import { Pressable, View, Animated } from 'react-native'
import { useSelector } from 'react-redux'

import { IconUser } from '@audius/harmony-native'
import { Text, ProfilePicture } from 'app/components/core'
import { FollowButton, FollowsYouBadge } from 'app/components/user'
import UserBadges from 'app/components/user-badges'
import { useNavigation } from 'app/hooks/useNavigation'
import { useColorAnimation } from 'app/hooks/usePressColorAnimation'
import { makeStyles } from 'app/styles'
import { useThemeColors } from 'app/utils/theme'

import { SupporterInfo } from './SupporterInfo'
import { SupportingInfo } from './SupportingInfo'

const getUserId = accountSelectors.getUserId

const messages = {
  followers: (followerCount: number) =>
    followerCount === 1 ? 'Follower' : 'Followers'
}

const useStyles = makeStyles(({ spacing, palette }) => ({
  root: {
    padding: spacing(4)
  },
  infoRoot: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing(2)
  },
  userInfo: {
    marginLeft: spacing(2),
    flex: 1
  },
  userStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  followerStats: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  userIcon: {
    color: palette.neutralLight4
  },
  displayName: {
    marginBottom: spacing(1)
  },
  handle: {
    marginBottom: spacing(2)
  }
}))

type UserListItemProps = {
  tag: string
  userId: ID
}

export const UserListItem = (props: UserListItemProps) => {
  const { tag, userId } = props
  const { data: user } = useUser(userId, {
    select: (user) => pick(user, ['handle', 'name', 'follower_count'])
  })
  const { handle, name, follower_count = 0 } = user ?? {}
  const currentUserId = useSelector(getUserId)
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
        <View style={styles.infoRoot}>
          <ProfilePicture userId={userId} size='large' />
          <View style={styles.userInfo}>
            <Text variant='h3' style={styles.displayName}>
              {name}
              <UserBadges user={user} badgeSize={10} hideName />
            </Text>
            <Text variant='body' style={styles.handle}>
              @{handle}
            </Text>
            <View style={styles.userStats}>
              <View style={styles.followerStats}>
                <IconUser height={15} width={15} fill={styles.userIcon.color} />
                <Text variant='body' color='neutralLight4'>
                  {' '}
                  <Text color='inherit' weight='bold' fontSize='small'>
                    {formatCount(follower_count)}{' '}
                  </Text>
                  {messages.followers(follower_count)}
                </Text>
              </View>
              <FollowsYouBadge userId={userId} />
            </View>
            {tag === 'SUPPORTING' ? <SupportingInfo userId={userId} /> : null}
            {tag === 'TOP SUPPORTERS' ? (
              <SupporterInfo userId={userId} />
            ) : null}
          </View>
        </View>
        {currentUserId !== userId ? (
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
