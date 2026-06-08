import { useCallback } from 'react'

import { useUser } from '@audius/common/api'
import { FanClubTextPostNotification as FanClubTextPostNotificationType } from '@audius/common/store'
import { route } from '@audius/common/utils'
import { Artwork, Flex, IconFanClub } from '@audius/harmony'
import { useDispatch } from 'react-redux'

import { push } from 'utils/navigation'

import { NotificationBody } from './components/NotificationBody'
import { NotificationFooter } from './components/NotificationFooter'
import { NotificationHeader } from './components/NotificationHeader'
import { NotificationTile } from './components/NotificationTile'
import { ProfilePicture } from './components/ProfilePicture'
import { UserNameLink } from './components/UserNameLink'

const { coinPage } = route

const messages = {
  body: ' posted a message to their fan club.'
}

type FanClubTextPostNotificationProps = {
  notification: FanClubTextPostNotificationType
}

export const FanClubTextPostNotification = (
  props: FanClubTextPostNotificationProps
) => {
  const { notification } = props
  const { entityUserId, timeLabel, isViewed } = notification
  const dispatch = useDispatch()

  const { data: user } = useUser(entityUserId)

  const handleClick = useCallback(() => {
    if (user?.fan_club_badge?.ticker) {
      dispatch(push(coinPage(user.fan_club_badge.ticker)))
    }
  }, [user, dispatch])

  if (!user) return null

  return (
    <NotificationTile notification={notification} onClick={handleClick}>
      <NotificationHeader icon={<IconFanClub color='accent' />}>
        <Flex direction='row' alignItems='center' pr='s'>
          <Flex css={{ marginRight: -8, zIndex: 1 }}>
            <ProfilePicture user={user} />
          </Flex>
          {user.fan_club_badge?.logo_uri ? (
            <Artwork src={user.fan_club_badge.logo_uri} hex w={40} h={40} />
          ) : null}
        </Flex>
      </NotificationHeader>
      <NotificationBody>
        <UserNameLink user={user} notification={notification} />
        {messages.body}
      </NotificationBody>
      <NotificationFooter timeLabel={timeLabel} isViewed={isViewed} />
    </NotificationTile>
  )
}
