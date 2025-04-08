import { useCallback } from 'react'

import { useUser } from '@audius/common/api'
import type { FollowSource, ID } from '@audius/common/models'
import { usersSocialActions } from '@audius/common/store'
import type { GestureResponderEvent } from 'react-native'
import { useDispatch } from 'react-redux'

import { FollowButton as HarmonyFollowButton } from '@audius/harmony-native'
import type { FollowButtonProps as HarmonyFollowButtonProps } from '@audius/harmony-native'

const { followUser, unfollowUser } = usersSocialActions

type FollowButtonsProps = Partial<HarmonyFollowButtonProps> & {
  userId: ID
  followSource: FollowSource
}

export const FollowButton = (props: FollowButtonsProps) => {
  const { userId, onPress, followSource, ...other } = props

  const { data: isFollowing } = useUser(userId, {
    select: (user) => user?.does_current_user_follow
  })

  const dispatch = useDispatch()

  const handlePress = useCallback(
    (event: GestureResponderEvent) => {
      onPress?.(event)
      requestAnimationFrame(() => {
        if (isFollowing) {
          dispatch(unfollowUser(userId, followSource))
        } else {
          dispatch(followUser(userId, followSource))
        }
      })
    },
    [onPress, dispatch, isFollowing, userId, followSource]
  )

  return (
    <HarmonyFollowButton
      isFollowing={isFollowing}
      onPress={handlePress}
      {...other}
    />
  )
}
