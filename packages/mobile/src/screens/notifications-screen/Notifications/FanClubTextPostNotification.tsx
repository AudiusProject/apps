import { useCallback } from 'react'

import { useUser } from '@audius/common/api'
import type { FanClubTextPostNotification as FanClubTextPostNotificationType } from '@audius/common/store'

import { Flex, IconFanClub } from '@audius/harmony-native'
import { TokenIcon } from 'app/components/core'
import { useNavigation } from 'app/hooks/useNavigation'

import {
  NotificationHeader,
  NotificationProfilePicture,
  NotificationText,
  NotificationTile,
  UserNameLink
} from '../Notification'

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
  const { entityUserId } = notification

  const navigation = useNavigation()
  const { data: user } = useUser(entityUserId)

  const handlePress = useCallback(() => {
    if (user?.fan_club_badge?.ticker) {
      navigation.push('CoinDetailsScreen', {
        ticker: user.fan_club_badge.ticker
      })
    }
  }, [user, navigation])

  if (!user) return null

  return (
    <NotificationTile notification={notification} onPress={handlePress}>
      <NotificationHeader icon={IconFanClub}>
        <Flex row alignItems='center' style={{ paddingRight: 8 }}>
          <NotificationProfilePicture
            profile={user}
            style={{ marginRight: -8, zIndex: 1 }}
          />
          {user.fan_club_badge?.logo_uri ? (
            <TokenIcon logoURI={user.fan_club_badge.logo_uri} size={40} />
          ) : null}
        </Flex>
      </NotificationHeader>
      <NotificationText>
        <UserNameLink user={user} />
        {messages.body}
      </NotificationText>
    </NotificationTile>
  )
}
