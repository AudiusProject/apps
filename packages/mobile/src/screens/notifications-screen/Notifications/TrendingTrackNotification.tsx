import { useCallback } from 'react'

import { useNotificationEntity } from '@audius/common/api'
import type {
  TrackEntity,
  TrendingTrackNotification as TrendingTrackNotificationType
} from '@audius/common/store'
import type { Nullable } from '@audius/common/utils'

import { IconTrending } from '@audius/harmony-native'
import { useNotificationNavigation } from 'app/hooks/useNotificationNavigation'

import {
  EntityLink,
  NotificationHeader,
  NotificationText,
  NotificationTile,
  NotificationShareCardButton,
  NotificationTitle
} from '../Notification'

const messages = {
  title: "You're Trending",
  is: 'is',
  trending: 'on Trending right now!',
}

type TrendingTrackNotificationProps = {
  notification: TrendingTrackNotificationType
}

export const TrendingTrackNotification = (
  props: TrendingTrackNotificationProps
) => {
  const { notification } = props
  const { rank } = notification

  const entity = useNotificationEntity(notification) as Nullable<TrackEntity>

  const navigation = useNotificationNavigation()

  const handlePress = useCallback(() => {
    if (entity) {
      navigation.navigate(notification)
    }
  }, [navigation, notification, entity])

  if (!entity) return null


  return (
    <NotificationTile notification={notification} onPress={handlePress}>
      <NotificationHeader icon={IconTrending}>
        <NotificationTitle>{messages.title}</NotificationTitle>
      </NotificationHeader>
      <NotificationText>
        <EntityLink entity={entity} /> {messages.is} #{rank} {messages.trending}
      </NotificationText>
      <NotificationShareCardButton
        trackId={notification.entityId}
        stat={{ kind: 'trending', rank }}
      />
    </NotificationTile>
  )
}
