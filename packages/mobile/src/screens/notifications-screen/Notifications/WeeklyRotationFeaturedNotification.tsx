import { useCallback } from 'react'

import { useNotificationEntity } from '@audius/common/api'
import { weeklyRotationFeaturedNotificationMessages as messages } from '@audius/common/messages'
import { Name } from '@audius/common/models'
import type {
  TrackEntity,
  WeeklyRotationFeaturedNotification as WeeklyRotationFeaturedNotificationType
} from '@audius/common/store'
import type { Nullable } from '@audius/common/utils'
import { make, useRecord } from 'common/store/analytics/actions'

import { IconArrowRotate } from '@audius/harmony-native'
import { useNotificationNavigation } from 'app/hooks/useNotificationNavigation'

import {
  EntityLink,
  NotificationHeader,
  NotificationText,
  NotificationTile,
  NotificationTitle
} from '../Notification'

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
  const { trackCount, rotationCount } = notification
  const navigation = useNotificationNavigation()
  const record = useRecord()
  const entity = useNotificationEntity(notification) as Nullable<TrackEntity>
  const isSingleTrack = trackCount === 1

  const handlePress = useCallback(() => {
    navigation.navigate(notification)
    record(
      make(Name.NOTIFICATIONS_CLICK_TILE, {
        kind: notification.type,
        link_to: isSingleTrack ? 'track' : 'profile'
      })
    )
  }, [navigation, notification, record, isSingleTrack])

  if (!entity) return null

  return (
    <NotificationTile notification={notification} onPress={handlePress}>
      <NotificationHeader icon={IconArrowRotate}>
        <NotificationTitle>{messages.title}</NotificationTitle>
      </NotificationHeader>
      <NotificationText>
        {isSingleTrack ? (
          <>
            {messages.your} <EntityLink entity={entity} />{' '}
            {messages.featuredIn(rotationCount)}
          </>
        ) : (
          <>
            {messages.yourTracks} {messages.tracksFeaturedIn(rotationCount)}
          </>
        )}
      </NotificationText>
    </NotificationTile>
  )
}
