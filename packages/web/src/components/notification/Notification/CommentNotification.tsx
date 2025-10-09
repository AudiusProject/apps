import { MouseEventHandler, useCallback } from 'react'

import { useNotificationEntity, useUsers } from '@audius/common/api'
import { Name } from '@audius/common/models'
import { CommentNotification as CommentNotificationType } from '@audius/common/store'
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
  commented: ' commented on your '
}

type CommentNotificationProps = {
  notification: CommentNotificationType
}
export const CommentNotification = (props: CommentNotificationProps) => {
  const { notification } = props
  const { commentId, id, userIds, entityType, timeLabel, isViewed } =
    notification
  const { data: users } = useUsers(
    notification.userIds.slice(0, USER_LENGTH_LIMIT)
  )
  const firstUser = users?.[0]
  const otherUsersCount = userIds.length - 1
  const isMultiUser = userIds.length > 1

  const entity = useNotificationEntity(notification)

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
          notificationType: 'comment'
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

  if (!users || !firstUser || !entity) return null

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
        {messages.commented}
        {entityType.toLowerCase()}{' '}
        <EntityLink entity={entity} entityType={entityType} />
      </NotificationBody>
      <NotificationFooter timeLabel={timeLabel} isViewed={isViewed} />
    </NotificationTile>
  )
}
