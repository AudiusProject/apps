import { useCallback } from 'react'

import { useUser } from '@audius/common/api'
import type { FanClubTextPostNotification as FanClubTextPostNotificationType } from '@audius/common/store'

import { IconCoinGatedLabel } from '@audius/harmony-native'
import { useNavigation } from 'app/hooks/useNavigation'

import {
  NotificationHeader,
  NotificationText,
  NotificationTile,
  NotificationTitle,
  UserNameLink
} from '../Notification'

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
  const { entityUserId } = notification

  const navigation = useNavigation()
  const { data: user } = useUser(entityUserId)

  const handlePress = useCallback(() => {
    if (user?.artist_coin_badge?.ticker) {
      navigation.push('CoinDetailsScreen', {
        ticker: user.artist_coin_badge.ticker
      })
    }
  }, [user, navigation])

  if (!user) return null

  return (
    <NotificationTile notification={notification} onPress={handlePress}>
      <NotificationHeader icon={IconCoinGatedLabel}>
        <NotificationTitle>{messages.title}</NotificationTitle>
      </NotificationHeader>
      <NotificationText>
        <UserNameLink user={user} /> {messages.body}
      </NotificationText>
    </NotificationTile>
  )
}
