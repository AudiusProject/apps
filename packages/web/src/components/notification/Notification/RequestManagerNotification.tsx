import { useCallback } from 'react'

import {
  RequestManagerNotification as RequestManagerNotificationType,
  notificationsSelectors
} from '@audius/common/store'
import { push } from 'connected-react-router'
import { useDispatch } from 'react-redux'

import { useSelector } from 'utils/reducer'

import { IconUserArrowRotate } from '@audius/harmony'
import { accountManagerInvitePage } from 'utils/route'
import { NotificationBody } from './components/NotificationBody'
import { NotificationFooter } from './components/NotificationFooter'
import { NotificationHeader } from './components/NotificationHeader'
import { NotificationTile } from './components/NotificationTile'
import { NotificationTitle } from './components/NotificationTitle'
import { UserNameLink } from './components/UserNameLink'

const { getNotificationUser } = notificationsSelectors

const messages = {
  title: 'Account Management Request',
  invitedYouToManage: 'has invited you to manage their account.'
}

type RequestManagerNotificationProps = {
  notification: RequestManagerNotificationType
}

export const RequestManagerNotification = (
  props: RequestManagerNotificationProps
) => {
  const { notification } = props
  const { timeLabel, isViewed } = notification
  const dispatch = useDispatch()
  const managedAccountUser = useSelector((state) =>
    getNotificationUser(state, notification)
  )

  const handleClick = useCallback(() => {
    if (managedAccountUser?.user_id) {
      dispatch(push(accountManagerInvitePage(managedAccountUser?.user_id)))
    }
  }, [dispatch, managedAccountUser?.user_id])

  if (!managedAccountUser) return null
  return (
    <NotificationTile notification={notification} onClick={handleClick}>
      <NotificationHeader icon={<IconUserArrowRotate />}>
        <NotificationTitle>{messages.title}</NotificationTitle>
      </NotificationHeader>
      <NotificationBody>
        <UserNameLink user={managedAccountUser} notification={notification} />{' '}
        {messages.invitedYouToManage}
      </NotificationBody>
      <NotificationFooter timeLabel={timeLabel} isViewed={isViewed} />
    </NotificationTile>
  )
}
