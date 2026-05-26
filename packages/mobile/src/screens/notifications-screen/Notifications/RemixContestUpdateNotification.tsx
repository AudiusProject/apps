import { useCallback } from 'react'

import { useTrack, useUser } from '@audius/common/api'
import type { RemixContestUpdateNotification as RemixContestUpdateNotificationType } from '@audius/common/store'

import { IconTrophy } from '@audius/harmony-native'
import { useNavigation } from 'app/hooks/useNavigation'

import {
  NotificationHeader,
  NotificationText,
  NotificationTile,
  NotificationTitle,
  EntityLink,
  UserNameLink
} from '../Notification'

const messages = {
  title: 'Contest update',
  description: 'posted an update in'
}

type RemixContestUpdateNotificationProps = {
  notification: RemixContestUpdateNotificationType
}

export const RemixContestUpdateNotification = (
  props: RemixContestUpdateNotificationProps
) => {
  const { notification } = props
  const { entityId, entityUserId } = notification

  const navigation = useNavigation()
  const { data: user } = useUser(entityUserId)
  const { data: track } = useTrack(entityId)

  const handlePress = useCallback(() => {
    if (track) {
      navigation.push('Contest', {
        trackId: track.track_id
      })
    }
  }, [track, navigation])

  if (!user || !track) return null

  return (
    <NotificationTile notification={notification} onPress={handlePress}>
      <NotificationHeader icon={IconTrophy}>
        <NotificationTitle>{messages.title}</NotificationTitle>
      </NotificationHeader>
      <NotificationText>
        <UserNameLink user={user} /> {messages.description}{' '}
        <EntityLink entity={track} />
      </NotificationText>
    </NotificationTile>
  )
}
