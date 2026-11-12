import { useCallback } from 'react'

import { useNotificationEntity } from '@audius/common/api'
import { weeklyRotationFeaturedNotificationMessages as messages } from '@audius/common/messages'
import { Name } from '@audius/common/models'
import { WeeklyRotationFeaturedNotification as WeeklyRotationFeaturedNotificationType } from '@audius/common/store'
import { route } from '@audius/common/utils'
import { useDispatch } from 'react-redux'

import { make, useRecord } from 'common/store/analytics/actions'
import { push } from 'utils/navigation'

import { EntityLink } from './components/EntityLink'
import { NotificationBody } from './components/NotificationBody'
import { NotificationFooter } from './components/NotificationFooter'
import { NotificationHeader } from './components/NotificationHeader'
import { NotificationTile } from './components/NotificationTile'
import { NotificationTitle } from './components/NotificationTitle'
import { IconWeeklyRotation } from './components/icons'
import { getEntityLink } from './utils'

const { profilePage } = route

type WeeklyRotationFeaturedNotificationProps = {
  notification: WeeklyRotationFeaturedNotificationType
}

/**
 * Tells an artist how many listeners' Weekly Rotations included their tracks
 * last period (sent on the Wednesday rollover). One track: names it and opens
 * it. Several: opens the artist's profile.
 */
export const WeeklyRotationFeaturedNotification = (
  props: WeeklyRotationFeaturedNotificationProps
) => {
  const { notification } = props
  const { entityType, trackCount, rotationCount, timeLabel, isViewed } =
    notification
  const dispatch = useDispatch()
  const record = useRecord()
  const entity = useNotificationEntity(notification)
  const isSingleTrack = trackCount === 1

  const link = entity
    ? isSingleTrack
      ? getEntityLink(entity)
      : profilePage(entity.user?.handle)
    : null

  const handleClick = useCallback(() => {
    if (!link) return
    dispatch(push(link))
    record(
      make(Name.NOTIFICATIONS_CLICK_TILE, {
        kind: notification.type,
        link_to: link
      })
    )
  }, [dispatch, link, notification.type, record])

  if (!entity) return null

  return (
    <NotificationTile notification={notification} onClick={handleClick}>
      <NotificationHeader icon={<IconWeeklyRotation />}>
        <NotificationTitle>{messages.title}</NotificationTitle>
      </NotificationHeader>
      <NotificationBody>
        {isSingleTrack ? (
          <>
            {messages.your}{' '}
            <EntityLink entity={entity} entityType={entityType} />{' '}
            {messages.featuredIn(rotationCount)}
          </>
        ) : (
          <>
            {messages.yourTracks} {messages.tracksFeaturedIn(rotationCount)}
          </>
        )}
      </NotificationBody>
      <NotificationFooter timeLabel={timeLabel} isViewed={isViewed} />
    </NotificationTile>
  )
}
