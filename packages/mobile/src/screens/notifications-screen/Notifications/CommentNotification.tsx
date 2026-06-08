import React, { useCallback } from 'react'

import { useNotificationEntity, useUsers } from '@audius/common/api'
import type { CommentNotification as CommentNotificationType } from '@audius/common/store'
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
  others: (count: number) => ` and ${count} other${count > 1 ? 's' : ''}`,
  commented: 'commented on your',
  remixContestLabel: 'remix contest'
}

type CommentNotificationProps = {
  notification: CommentNotificationType
}

export const CommentNotification = (props: CommentNotificationProps) => {
  const { notification } = props
  const { userIds, entityType } = notification
  const navigation = useNotificationNavigation()

  const { data: users } = useUsers(
    notification.userIds.slice(0, USER_LENGTH_LIMIT)
  )

  const firstUser = users?.[0]
  const otherUsersCount = userIds.length - 1

  const entity = useNotificationEntity(notification)

  const handlePress = useCallback(() => {
    navigation.navigate(notification)
    // Optionally keep analytics tracking here
  }, [navigation, notification])

  if (!users || !firstUser || !entity) return null

  return (
    <NotificationTile notification={notification} onPress={handlePress}>
      <NotificationHeader icon={IconMessage}>
        <ProfilePictureList users={users} />
      </NotificationHeader>
      <NotificationText>
        <UserNameLink user={firstUser} />
        {otherUsersCount > 0 ? messages.others(otherUsersCount) : null}{' '}
        {messages.commented}{' '}
        {entityType === Entity.Event
          ? messages.remixContestLabel
          : entityType.toLowerCase()}{' '}
        <EntityLink entity={entity} commentId={notification.commentId} />
      </NotificationText>
    </NotificationTile>
  )
}
