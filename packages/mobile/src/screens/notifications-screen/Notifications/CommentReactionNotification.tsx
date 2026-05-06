import React, { useCallback } from 'react'

import {
  useCurrentUserId,
  useNotificationEntity,
  useUsers
} from '@audius/common/api'
import type { CommentReactionNotification as CommentReactionNotificationType } from '@audius/common/store'
import { Entity } from '@audius/common/store'

import { IconMessage } from '@audius/harmony-native'
import { useNotificationNavigation } from 'app/hooks/useNotificationNavigation'

import {
  EntityLink,
  NotificationHeader,
  NotificationText,
  NotificationTile,
  ProfilePictureList,
  UserNameLink
} from '../Notification'

const USER_LENGTH_LIMIT = 3

const messages = {
  liked: ' liked your comment on ',
  your: 'your',
  their: 'their',
  remixContestLabel: 'remix contest'
}

type CommentReactionNotificationProps = {
  notification: CommentReactionNotificationType
}

export const CommentReactionNotification = (
  props: CommentReactionNotificationProps
) => {
  const { notification } = props
  const { userIds, entityType } = notification
  const navigation = useNotificationNavigation()

  const { data: users } = useUsers(
    notification.userIds.slice(0, USER_LENGTH_LIMIT)
  )

  const firstUser = users?.[0]
  const otherUsersCount = userIds.length - 1

  const entity = useNotificationEntity(notification)
  const { data: currentUserId } = useCurrentUserId()
  const isOwner = entity?.user?.user_id === currentUserId
  const isOwnerReaction =
    entity?.user?.user_id === firstUser?.user_id && otherUsersCount === 0

  const handlePress = useCallback(() => {
    navigation.navigate(notification)
  }, [navigation, notification])

  if (!users || !firstUser || !entity || !entity.user) return null

  return (
    <NotificationTile notification={notification} onPress={handlePress}>
      <NotificationHeader icon={IconMessage}>
        <ProfilePictureList users={users} />
      </NotificationHeader>
      <NotificationText>
        <UserNameLink user={firstUser} />
        {otherUsersCount > 0
          ? ` and ${otherUsersCount} other${otherUsersCount > 1 ? 's' : ''}`
          : null}{' '}
        {messages.liked}{' '}
        {isOwner ? (
          messages.your
        ) : isOwnerReaction ? (
          messages.their
        ) : (
          <UserNameLink user={entity.user} isOwner />
        )}{' '}
        {entityType === Entity.Event
          ? messages.remixContestLabel
          : entityType
            ? entityType.toLowerCase()
            : messages.remixContestLabel}{' '}
        <EntityLink entity={entity} />
      </NotificationText>
    </NotificationTile>
  )
}
