import { useCallback } from 'react'

import {
  useCurrentUserId,
  useNotificationEntity,
  useUsers
} from '@audius/common/api'
import { Name } from '@audius/common/models'
import type { CommentThreadNotification as CommentThreadNotificationType } from '@audius/common/store'
import { Entity } from '@audius/common/store'
import { formatCount } from '@audius/common/utils'

import { IconMessage } from '@audius/harmony-native'
import { useNotificationNavigation } from 'app/hooks/useNotificationNavigation'
import { make, track } from 'app/services/analytics'

import {
  NotificationHeader,
  NotificationTile,
  ProfilePictureList,
  UserNameLink,
  USER_LENGTH_LIMIT,
  NotificationText,
  EntityLink
} from '../Notification'

const messages = {
  others: (userCount: number) =>
    ` and ${formatCount(userCount)} other${userCount > 1 ? 's' : ''}`,
  replied: 'replied to your comment on',
  your: 'your',
  their: 'their',
  remixContestLabel: 'remix contest'
}

type CommentThreadNotificationProps = {
  notification: CommentThreadNotificationType
}

export const CommentThreadNotification = (
  props: CommentThreadNotificationProps
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
  const isOwnerReply =
    entity?.user?.user_id === firstUser?.user_id && otherUsersCount === 0

  const handlePress = useCallback(() => {
    navigation.navigate(notification)
    track(
      make({
        eventName: Name.COMMENTS_NOTIFICATION_OPEN,
        commentId: notification.entityId,
        notificationType: 'thread'
      })
    )
  }, [navigation, notification])

  if (!users || !firstUser || !entity || !entity.user) return null

  return (
    <NotificationTile notification={notification} onPress={handlePress}>
      <NotificationHeader icon={IconMessage}>
        <ProfilePictureList users={users} />
      </NotificationHeader>
      <NotificationText>
        <UserNameLink user={firstUser} />
        {otherUsersCount > 0 ? messages.others(otherUsersCount) : null}{' '}
        {messages.replied}{' '}
        {isOwner ? (
          messages.your
        ) : isOwnerReply ? (
          messages.their
        ) : (
          <UserNameLink user={entity.user} isOwner />
        )}{' '}
        {entityType === Entity.Event
          ? messages.remixContestLabel
          : entityType.toLowerCase()}{' '}
        <EntityLink entity={entity} />
      </NotificationText>
    </NotificationTile>
  )
}
