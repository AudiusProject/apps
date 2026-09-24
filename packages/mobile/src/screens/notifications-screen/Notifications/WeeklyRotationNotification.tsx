import { useCallback } from 'react'

import { useFeatureFlag } from '@audius/common/hooks'
import { weeklyRotationNotificationMessages as messages } from '@audius/common/messages'
import { FeatureFlags } from '@audius/common/services'
import type { WeeklyRotationNotification as WeeklyRotationNotificationType } from '@audius/common/store'

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
  const { isEnabled: isWeeklyRotationEnabled } = useFeatureFlag(
    FeatureFlags.WEEKLY_ROTATION
  )

  const handlePress = useCallback(() => {
    navigation.navigate(notification)
  }, [navigation, notification])

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
