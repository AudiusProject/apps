import { MouseEventHandler, useCallback } from 'react'

import {
  useCurrentUserId,
  useNotificationEntity,
  useUsers
} from '@audius/common/api'
import { Name } from '@audius/common/models'
import {
  CommentReactionNotification as CommentReactionNotificationType,
  Entity
} from '@audius/common/store'
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
  liked: ' liked your comment on ',
  your: 'your',
  their: 'their',
  // Generic fallback when the notification entityType isn't a value we
  // know how to render (e.g. backend hasn't indexed a remix-contest
  // comment with a typed entity yet — the QA pass found these
  // notifications were rendering "their undefined" because
  // `entityType` was missing on the payload).
  fallbackEntityLabel: 'remix contest'
}

type CommentReactionNotificationProps = {
  notification: CommentReactionNotificationType
}

export const CommentReactionNotification = (
  props: CommentReactionNotificationProps
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
  const isOwnerReaction =
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

      track(
        make({
          eventName: Name.COMMENTS_NOTIFICATION_OPEN,
          commentId: notification.entityId,
          notificationType: 'reaction'
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
        {messages.liked}{' '}
        {isOwner ? (
          messages.your
        ) : isOwnerReaction ? (
          messages.their
        ) : (
          <UserNameLink
            user={entity.user}
            notification={notification}
            isOwner
          />
        )}{' '}
        {/* `entityType` is optional in payloads from the indexer for
            comment reactions on remix contests — guard the rendering
            so we don't ship a literal "undefined" to users. Event-typed
            payloads render the human-readable "remix contest" label
            instead of the raw enum string. */}
        {entityType === Entity.Event
          ? messages.fallbackEntityLabel
          : entityType
            ? entityType.toLowerCase()
            : messages.fallbackEntityLabel}{' '}
        <EntityLink entity={entity} entityType={entityType} />
      </NotificationBody>
      <NotificationFooter timeLabel={timeLabel} isViewed={isViewed} />
    </NotificationTile>
  )
}
