import { useCallback } from 'react'

import { useFeatureFlag } from '@audius/common/hooks'
import { weeklyArtistRecapNotificationMessages as messages } from '@audius/common/messages'
import { Name } from '@audius/common/models'
import { FeatureFlags } from '@audius/common/services'
import { WeeklyArtistRecapNotification as WeeklyArtistRecapNotificationType } from '@audius/common/store'
import { route } from '@audius/common/utils'
import { useDispatch } from 'react-redux'

import { make, useRecord } from 'common/store/analytics/actions'
import { push } from 'utils/navigation'

import { NotificationBody } from './components/NotificationBody'
import { NotificationFooter } from './components/NotificationFooter'
import { NotificationHeader } from './components/NotificationHeader'
import { NotificationTile } from './components/NotificationTile'
import { NotificationTitle } from './components/NotificationTitle'
import { IconTrending } from './components/icons'

const { DASHBOARD_PAGE } = route

type WeeklyArtistRecapNotificationProps = {
  notification: WeeklyArtistRecapNotificationType
}

/**
 * An artist's numbers for the week that just closed (sent Wednesdays). Opens
 * the Artist Dashboard. Hidden when the flag is off, since the server sends
 * it regardless.
 */
export const WeeklyArtistRecapNotification = (
  props: WeeklyArtistRecapNotificationProps
) => {
  const { notification } = props
  const { timeLabel, isViewed, rotationSaveCount } = notification
  const record = useRecord()
  const dispatch = useDispatch()
  const { isEnabled } = useFeatureFlag(FeatureFlags.WEEKLY_ARTIST_RECAP)

  const handleClick = useCallback(() => {
    dispatch(push(DASHBOARD_PAGE))
    record(
      make(Name.NOTIFICATIONS_CLICK_TILE, {
        kind: notification.type,
        link_to: DASHBOARD_PAGE
      })
    )
  }, [dispatch, notification.type, record])

  if (!isEnabled) return null

  return (
    <NotificationTile notification={notification} onClick={handleClick}>
      <NotificationHeader icon={<IconTrending />}>
        <NotificationTitle>{messages.title}</NotificationTitle>
      </NotificationHeader>
      <NotificationBody>
        {messages.body(notification)}
        {rotationSaveCount > 0
          ? ` ${messages.rotationSaves(rotationSaveCount)}`
          : null}
      </NotificationBody>
      <NotificationFooter timeLabel={timeLabel} isViewed={isViewed} />
    </NotificationTile>
  )
}
