import { useCallback } from 'react'

import { useFeatureFlag } from '@audius/common/hooks'
import { weeklyArtistRecapNotificationMessages as messages } from '@audius/common/messages'
import { Name } from '@audius/common/models'
import { FeatureFlags } from '@audius/common/services'
import type { WeeklyArtistRecapNotification as WeeklyArtistRecapNotificationType } from '@audius/common/store'
import { make, useRecord } from 'common/store/analytics/actions'

import { IconTrending } from '@audius/harmony-native'
import { useNavigation } from 'app/hooks/useNavigation'

import {
  NotificationHeader,
  NotificationText,
  NotificationTile,
  NotificationTitle
} from '../Notification'

type WeeklyArtistRecapNotificationProps = {
  notification: WeeklyArtistRecapNotificationType
}

/**
 * An artist's numbers for the week that just closed (sent Wednesdays). Opens
 * the artist's own profile. Hidden when the flag is off, since the server
 * sends it regardless.
 */
export const WeeklyArtistRecapNotification = (
  props: WeeklyArtistRecapNotificationProps
) => {
  const { notification } = props
  const { rotationSaveCount } = notification
  const navigation = useNavigation()
  const record = useRecord()
  const { isEnabled } = useFeatureFlag(FeatureFlags.WEEKLY_ARTIST_RECAP)

  const handlePress = useCallback(() => {
    navigation.navigate('Profile', { handle: 'accountUser' })
    record(
      make(Name.NOTIFICATIONS_CLICK_TILE, {
        kind: notification.type,
        link_to: 'profile'
      })
    )
  }, [navigation, notification.type, record])

  if (!isEnabled) return null

  return (
    <NotificationTile notification={notification} onPress={handlePress}>
      <NotificationHeader icon={IconTrending}>
        <NotificationTitle>{messages.title}</NotificationTitle>
      </NotificationHeader>
      <NotificationText>
        {messages.body(notification)}
        {rotationSaveCount > 0
          ? ` ${messages.rotationSaves(rotationSaveCount)}`
          : null}
      </NotificationText>
    </NotificationTile>
  )
}
