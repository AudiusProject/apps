import { useCallback } from 'react'

import { useUsers } from '@audius/common/api'
import { FollowNotification as FollowNotificationType } from '@audius/common/store'
import { route } from '@audius/common/utils'
import { useDispatch } from 'react-redux'

import { UserProfilePictureList } from 'components/user-profile-picture-list'
import { useIsMobile } from 'hooks/useIsMobile'
import {
  setUsers as setUserListUsers,
  setVisibility as openUserListModal
} from 'store/application/ui/userListModal/slice'
import {
  UserListEntityType,
  UserListType
} from 'store/application/ui/userListModal/types'
import { push } from 'utils/navigation'

import { NotificationBody } from './components/NotificationBody'
import { NotificationFooter } from './components/NotificationFooter'
import { NotificationHeader } from './components/NotificationHeader'
import { NotificationTile } from './components/NotificationTile'
import { OthersLink } from './components/OthersLink'
import { UserNameLink } from './components/UserNameLink'
import { IconFollow } from './components/icons'
import { USER_LENGTH_LIMIT } from './utils'

const { profilePage } = route

const messages = {
  and: 'and',
  followed: ' followed you'
}

type FollowNotificationProps = {
  notification: FollowNotificationType
}

export const FollowNotification = (props: FollowNotificationProps) => {
  const { notification } = props
  const { id, userIds, timeLabel, isViewed } = notification
  const { data: users } = useUsers(
    notification.userIds.slice(0, USER_LENGTH_LIMIT)
  )
  const firstUser = users?.[0]
  const otherUsersCount = userIds.length - 1
  const isMultiUser = userIds.length > 1
  const dispatch = useDispatch()
  const isMobile = useIsMobile()

  const handleClick = useCallback(() => {
    if (isMultiUser) {
      dispatch(
        setUserListUsers({
          userListType: UserListType.NOTIFICATION,
          entityType: UserListEntityType.USER,
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
      if (firstUser) {
        dispatch(push(profilePage(firstUser.handle)))
      }
    }
  }, [isMultiUser, dispatch, id, notification, isMobile, firstUser])

  if (!users || !firstUser) return null

  return (
    <NotificationTile notification={notification} onClick={handleClick}>
      <NotificationHeader icon={<IconFollow />}>
        <UserProfilePictureList users={users} stopPropagation />
      </NotificationHeader>
      <NotificationBody>
        <UserNameLink user={firstUser} notification={notification} />{' '}
        {otherUsersCount > 0 ? (
          <OthersLink othersCount={otherUsersCount} onClick={handleClick} />
        ) : null}
        {messages.followed}
      </NotificationBody>
      <NotificationFooter timeLabel={timeLabel} isViewed={isViewed} />
    </NotificationTile>
  )
}
