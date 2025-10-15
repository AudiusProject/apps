import { MouseEventHandler, useCallback } from 'react'

import { useNotificationEntity, useUsers } from '@audius/common/api'
import {
  Entity,
  FavoriteNotification as FavoriteNotificationType
} from '@audius/common/store'
import { useDispatch } from 'react-redux'

import { UserProfilePictureList } from 'components/user-profile-picture-list'
import { useIsMobile } from 'hooks/useIsMobile'
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
import { IconFavorite } from './components/icons'
import { entityToUserListEntity, USER_LENGTH_LIMIT } from './utils'

const messages = {
  favorited: ' favorited your '
}

type FavoriteNotificationProps = {
  notification: FavoriteNotificationType
}
export const FavoriteNotification = (props: FavoriteNotificationProps) => {
  const { notification } = props
  const { id, userIds, entityType, timeLabel, isViewed } = notification
  const { data: users } = useUsers(userIds.slice(0, USER_LENGTH_LIMIT))
  const firstUser = users?.[0]
  const otherUsersCount = userIds.length - 1
  const isMultiUser = userIds.length > 1

  const entity = useNotificationEntity(notification)

  const entityTypeText =
    entity && 'is_album' in entity && entity.is_album
      ? Entity.Album
      : entityType

  const dispatch = useDispatch()
  const isMobile = useIsMobile()

  const handleGoToEntity = useGoToEntity(entity, entityType)

  const handleClick: MouseEventHandler = useCallback(
    (event) => {
      if (isMultiUser) {
        dispatch(
          setUserListUsers({
            userListType: UserListType.NOTIFICATION,
            entityType: entityToUserListEntity[entityType],
            id: id as unknown as number,
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
      <NotificationHeader icon={<IconFavorite />}>
        <UserProfilePictureList users={users} stopPropagation />
      </NotificationHeader>
      <NotificationBody>
        <UserNameLink user={firstUser} notification={notification} />{' '}
        {otherUsersCount > 0 ? (
          <OthersLink othersCount={otherUsersCount} onClick={handleClick} />
        ) : null}
        {messages.favorited}
        {entityTypeText.toLowerCase()}{' '}
        <EntityLink entity={entity} entityType={entityTypeText} />
      </NotificationBody>
      <NotificationFooter timeLabel={timeLabel} isViewed={isViewed} />
    </NotificationTile>
  )
}
