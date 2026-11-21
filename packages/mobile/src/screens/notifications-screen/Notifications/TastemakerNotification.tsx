import React, { useCallback } from 'react'

import { useNotificationEntity, useUser } from '@audius/common/api'
import type {
  TastemakerNotification as TastemakerNotificationType,
  TrackEntity
} from '@audius/common/store'
import type { Nullable } from '@audius/common/utils'

import { IconTastemaker } from '@audius/harmony-native'
import { useNotificationNavigation } from 'app/hooks/useNotificationNavigation'

import {
  EntityLink,
  NotificationHeader,
  NotificationText,
  NotificationTile,
  NotificationXButton
} from '../Notification'

const messages = {
  title: "You're a Tastemaker!",
  tastemaker: 'is now trending thanks to you! Great work 🙌',
  xShare: (handle: string, trackTitle: string) =>
    `I was one of the first to discover ${trackTitle} by ${handle} on @audius and it just made it onto trending! $AUDIO`
}

type TastemakerNotificationProps = {
  notification: TastemakerNotificationType
}

export const TastemakerNotification = (props: TastemakerNotificationProps) => {
  const { notification } = props
  const navigation = useNotificationNavigation()
  const entity = useNotificationEntity(notification) as Nullable<TrackEntity>
  const { data: trackOwnerUser } = useUser(notification.userId)

  const handlePress = useCallback(() => {
    if (entity) {
      navigation.navigate(notification)
    }
  }, [entity, navigation, notification])

  const handleShare = useCallback(
    (trackOwnerHandle: string) => {
      if (!entity) return null
      const trackTitle = entity.title ?? ''
      const shareText = messages.xShare(trackOwnerHandle, trackTitle)
      const analytics = {
        eventName: 'NOTIFICATIONS_CLICK_TASTEMAKER_TWITTER_SHARE',
        text: shareText
      } as any
      return { shareText, analytics }
    },
    [entity]
  )

  if (!entity || !trackOwnerUser) return null

  return (
    <NotificationTile notification={notification} onPress={handlePress}>
      <NotificationHeader icon={IconTastemaker}>
        <NotificationText>
          <EntityLink entity={entity} /> {messages.tastemaker}
        </NotificationText>
      </NotificationHeader>
      <NotificationXButton
        type='dynamic'
        handle={trackOwnerUser.handle}
        shareData={handleShare}
      />
    </NotificationTile>
  )
}
