import { useCallback } from 'react'

import { useNotificationEntity } from '@audius/common/api'
import { useFeatureFlag } from '@audius/common/hooks'
import { trendingGenreNotificationMessages as messages } from '@audius/common/messages'
import { FeatureFlags } from '@audius/common/services'
import type {
  TrackEntity,
  TrendingGenreNotification as TrendingGenreNotificationType
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

type TrendingGenreNotificationProps = {
  notification: TrendingGenreNotificationType
}

/**
 * The artist's track is in the top 10 of its genre's weekly chart (sent
 * Fridays). Hidden when the flag is off, since the server sends it regardless.
 */
export const TrendingGenreNotification = (
  props: TrendingGenreNotificationProps
) => {
  const { notification } = props
  const { rank, genre } = notification
  const { isEnabled } = useFeatureFlag(FeatureFlags.TRENDING_GENRE_NOTIFICATION)

  const entity = useNotificationEntity(notification) as Nullable<TrackEntity>

  const navigation = useNotificationNavigation()

  const handlePress = useCallback(() => {
    if (entity) {
      navigation.navigate(notification)
    }
  }, [navigation, notification, entity])

  if (!isEnabled || !entity) return null

  return (
    <NotificationTile notification={notification} onPress={handlePress}>
      <NotificationHeader icon={IconTrending}>
        <NotificationTitle>{messages.title(genre)}</NotificationTitle>
      </NotificationHeader>
      <NotificationText>
        <EntityLink entity={entity} /> {messages.is}{' '}
        {messages.inGenre(rank, genre)}
      </NotificationText>
      <NotificationShareCardButton
        trackId={notification.entityId}
        stat={{ kind: 'genre', rank, genre }}
      />
    </NotificationTile>
  )
}
