import { MouseEventHandler, useCallback } from 'react'

import {
  useCurrentUserId,
  useNotificationEntity,
  useUsers
} from '@audius/common/api'
import { Name } from '@audius/common/models'
import { CommentThreadNotification as CommentThreadNotificationType } from '@audius/common/store'
import { IconMessage } from '@audius/harmony'
import { useDispatch } from 'react-redux'

import { UserProfilePictureList } from 'components/user-profile-picture-list'
import { useIsMobile } from 'hooks/useIsMobile'
import { make, track } from 'services/analytics'
import {
  setUsers as setUserListUsers,
  setVisibility as openUserListModal
} from 'store/application/ui/userListModal/slice'
import { UserListType } from 'store/application/ui/userListModal/types'
import { push } from 'utils/navigation'

import { EntityLink, useGoToEntity } from './components/EntityLink'
import { NotificationBody } from './components/NotificationBody'
import { NotificationFooter } from './components/NotificationFooter'
import { NotificationHeader } from './components/NotificationHeader'
import { NotificationTile } from './components/NotificationTile'
import { OthersLink } from './components/OthersLink'
import { UserNameLink } from './components/UserNameLink'
import { entityToUserListEntity, USER_LENGTH_LIMIT } from './utils'

const messages = {
  replied: ' replied to your comment on',
  your: 'your',
  their: 'their'
}

type CommentThreadNotificationProps = {
  notification: CommentThreadNotificationType
}

export const CommentThreadNotification = (
  props: CommentThreadNotificationProps
) => {
  const { notification } = props
  const { commentId, id, userIds, entityType, timeLabel, isViewed } =
    notification
  const { data: users } = useUsers(userIds.slice(0, USER_LENGTH_LIMIT))
  const firstUser = users?.[0]
  const otherUsersCount = userIds.length - 1
  const isMultiUser = userIds.length > 1

  const entity = useNotificationEntity(notification)

  const { data: currentUserId } = useCurrentUserId()
  const isOwner = entity?.user?.user_id === currentUserId
  const isOwnerReply =
    entity?.user?.user_id === firstUser?.user_id && !isMultiUser
  const dispatch = useDispatch()
  const isMobile = useIsMobile()

  const handleGoToEntity = useGoToEntity(entity, entityType, true, commentId)

  const handleClick: MouseEventHandler = useCallback(
    (event) => {
      if (isMultiUser) {
        dispatch(
          setUserListUsers({
            userListType: UserListType.NOTIFICATION,
            entityType: entityToUserListEntity[entityType],
            entity: notification
          })
        )
        if (isMobile) {
          dispatch(push(`notification/${id}/users`))
        } else {
          dispatch(openUserListModal(true))
        }
      } else {
        handleGoToEntity(event)
      }

      track(
        make({
          eventName: Name.COMMENTS_NOTIFICATION_OPEN,
          commentId: notification.entityId,
          notificationType: 'thread'
        })
      )
    },
    [
      isMultiUser,
      notification,
      dispatch,
      entityType,
      id,
      isMobile,
      handleGoToEntity
    ]
  )

  if (!users || !firstUser || !entity || !entity.user) return null

  return (
    <NotificationTile notification={notification} onClick={handleClick}>
      <NotificationHeader icon={<IconMessage color='accent' />}>
        <UserProfilePictureList users={users} stopPropagation />
      </NotificationHeader>
      <NotificationBody>
        <UserNameLink user={firstUser} notification={notification} />{' '}
        {otherUsersCount > 0 ? (
          <OthersLink othersCount={otherUsersCount} onClick={handleClick} />
        ) : null}
        {messages.replied}{' '}
        {isOwner ? (
          messages.your
        ) : isOwnerReply ? (
          messages.their
        ) : (
          <UserNameLink
            user={entity.user}
            notification={notification}
            isOwner
          />
        )}{' '}
        {entityType.toLowerCase()}{' '}
        <EntityLink entity={entity} entityType={entityType} />
      </NotificationBody>
      <NotificationFooter timeLabel={timeLabel} isViewed={isViewed} />
    </NotificationTile>
  )
}
