import { useCallback } from 'react'

import { useFeatureFlag } from '@audius/common/hooks'
import { weeklyRotationNotificationMessages as messages } from '@audius/common/messages'
import { Name } from '@audius/common/models'
import { FeatureFlags } from '@audius/common/services'
import type { WeeklyRotationNotification as WeeklyRotationNotificationType } from '@audius/common/store'
import { route } from '@audius/common/utils'
import { make, useRecord } from 'common/store/analytics/actions'

import { IconArrowRotate } from '@audius/harmony-native'
import { useNotificationNavigation } from 'app/hooks/useNotificationNavigation'

import {
  NotificationHeader,
  NotificationText,
  NotificationTile,
  NotificationTitle
} from '../Notification'

type WeeklyRotationNotificationProps = {
  notification: WeeklyRotationNotificationType
}

/**
 * Weekly Rotation ready notification (sent Wednesdays); opens the viewer's
 * mix. Hidden when the flag is off.
 */
export const WeeklyRotationNotification = (
  props: WeeklyRotationNotificationProps
) => {
  const { notification } = props
  const navigation = useNotificationNavigation()
  const record = useRecord()
  const { isEnabled: isWeeklyRotationEnabled } = useFeatureFlag(
    FeatureFlags.WEEKLY_ROTATION
  )

  const handlePress = useCallback(() => {
    navigation.navigate(notification)
    record(
      make(Name.NOTIFICATIONS_CLICK_TILE, {
        kind: notification.type,
        link_to: route.WEEKLY_ROTATION_PAGE
      })
    )
  }, [navigation, notification, record])

  if (!isWeeklyRotationEnabled) return null

  return (
    <NotificationTile notification={notification} onPress={handlePress}>
      <NotificationHeader icon={IconArrowRotate}>
        <NotificationTitle>{messages.title}</NotificationTitle>
      </NotificationHeader>
      <NotificationText>{messages.body}</NotificationText>
    </NotificationTile>
  )
}
