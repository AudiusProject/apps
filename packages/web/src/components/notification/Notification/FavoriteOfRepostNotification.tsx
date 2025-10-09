import { useNotificationEntity, useUsers } from '@audius/common/api'
import {
  Entity,
  FavoriteOfRepostNotification as FavoriteOfRepostNotificationType
} from '@audius/common/store'

import { UserProfilePictureList } from 'components/user-profile-picture-list'

import { EntityLink, useGoToEntity } from './components/EntityLink'
import { NotificationBody } from './components/NotificationBody'
import { NotificationFooter } from './components/NotificationFooter'
import { NotificationHeader } from './components/NotificationHeader'
import { NotificationTile } from './components/NotificationTile'
import { OthersText } from './components/OthersLink'
import { UserNameLink } from './components/UserNameLink'
import { IconFavorite } from './components/icons'
import { USER_LENGTH_LIMIT } from './utils'

const messages = {
  favorited: ' favorited your repost of '
}

type FavoriteOfRepostNotificationProps = {
  notification: FavoriteOfRepostNotificationType
}
export const FavoriteOfRepostNotification = (
  props: FavoriteOfRepostNotificationProps
) => {
  const { notification } = props
  const { userIds, entityType, timeLabel, isViewed } = notification
  const { data: users } = useUsers(userIds.slice(0, USER_LENGTH_LIMIT))
  const firstUser = users?.[0]
  const otherUsersCount = userIds.length - 1

  const entity = useNotificationEntity(notification)

  const entityTypeText =
    entity && 'is_album' in entity && entity.is_album
      ? Entity.Album
      : entityType

  const handleGoToEntity = useGoToEntity(entity, entityType)

  if (!users || !firstUser || !entity) return null

  return (
    <NotificationTile
      notification={notification}
      onClick={handleGoToEntity}
      disableClosePanel
    >
      <NotificationHeader icon={<IconFavorite />}>
        <UserProfilePictureList users={users} stopPropagation />
      </NotificationHeader>
      <NotificationBody>
        <UserNameLink user={firstUser} notification={notification} />{' '}
        {otherUsersCount > 0 ? (
          <OthersText othersCount={otherUsersCount} />
        ) : null}
        {messages.favorited}
        {entityTypeText.toLowerCase()}{' '}
        <EntityLink entity={entity} entityType={entityTypeText} />
      </NotificationBody>
      <NotificationFooter timeLabel={timeLabel} isViewed={isViewed} />
    </NotificationTile>
  )
}
