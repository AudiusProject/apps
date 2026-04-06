import { useCallback } from 'react'

import { useUser } from '@audius/common/api'
import { FanClubTextPostNotification as FanClubTextPostNotificationType } from '@audius/common/store'
import { route } from '@audius/common/utils'
import { IconCoinGatedLabel } from '@audius/harmony'
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
  title: 'New Fan Club Post',
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
    if (user?.artist_coin_badge?.ticker) {
      dispatch(push(coinPage(user.artist_coin_badge.ticker)))
    }
  }, [user, dispatch])

  if (!user) return null

  return (
    <NotificationTile notification={notification} onClick={handleClick}>
      <NotificationHeader icon={<IconCoinGatedLabel color='accent' />}>
        <ProfilePicture user={user} />
      </NotificationHeader>
      <NotificationBody>
        <UserNameLink user={user} notification={notification} />
        {messages.body}
      </NotificationBody>
      <NotificationFooter timeLabel={timeLabel} isViewed={isViewed} />
    </NotificationTile>
  )
}
