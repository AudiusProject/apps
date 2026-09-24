import { useCallback } from 'react'

import { useFeatureFlag } from '@audius/common/hooks'
import { weeklyRotationNotificationMessages as messages } from '@audius/common/messages'
import { Name } from '@audius/common/models'
import { FeatureFlags } from '@audius/common/services'
import { WeeklyRotationNotification as WeeklyRotationNotificationType } from '@audius/common/store'
import { route } from '@audius/common/utils'
import { useDispatch } from 'react-redux'

import { make, useRecord } from 'common/store/analytics/actions'
import { push } from 'utils/navigation'

import { NotificationBody } from './components/NotificationBody'
import { NotificationFooter } from './components/NotificationFooter'
import { NotificationHeader } from './components/NotificationHeader'
import { NotificationTile } from './components/NotificationTile'
import { NotificationTitle } from './components/NotificationTitle'
import { IconWeeklyRotation } from './components/icons'

const { WEEKLY_ROTATION_PAGE } = route

type WeeklyRotationNotificationProps = {
  notification: WeeklyRotationNotificationType
}

/**
 * Weekly Rotation ready notification (sent Wednesdays); opens the viewer's
 * mix. Hidden when the flag is off, since the server sends it regardless.
 */
export const WeeklyRotationNotification = (
  props: WeeklyRotationNotificationProps
) => {
  const { notification } = props
  const record = useRecord()
  const dispatch = useDispatch()
  const { timeLabel, isViewed } = notification
  const { isEnabled: isWeeklyRotationEnabled } = useFeatureFlag(
    FeatureFlags.WEEKLY_ROTATION
  )

  const handleClick = useCallback(() => {
    dispatch(push(WEEKLY_ROTATION_PAGE))
    record(
      make(Name.NOTIFICATIONS_CLICK_TILE, {
        kind: notification.type,
        link_to: WEEKLY_ROTATION_PAGE
      })
    )
  }, [dispatch, notification, record])

  if (!isWeeklyRotationEnabled) return null

  return (
    <NotificationTile notification={notification} onClick={handleClick}>
      <NotificationHeader icon={<IconWeeklyRotation />}>
        <NotificationTitle>{messages.title}</NotificationTitle>
      </NotificationHeader>
      <NotificationBody>{messages.body}</NotificationBody>
      <NotificationFooter timeLabel={timeLabel} isViewed={isViewed} />
    </NotificationTile>
  )
}
