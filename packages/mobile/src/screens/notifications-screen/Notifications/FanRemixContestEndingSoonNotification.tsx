import { useCallback } from 'react'

import { useTrack, useUser } from '@audius/common/api'
import type { FanRemixContestEndingSoonNotification as FanRemixContestEndingSoonNotificationType } from '@audius/common/store'

import { IconTrophy } from '@audius/harmony-native'
import { useNavigation } from 'app/hooks/useNavigation'

import {
  NotificationHeader,
  NotificationText,
  NotificationTile,
  NotificationTitle,
  UserNameLink
} from '../Notification'

const messages = {
  title: 'Remix Contest Ending Soon',
  description:
    " has a remix contest ending in 72 hours - don't forget to submit your remix"
}

type FanRemixContestEndingSoonNotificationProps = {
  notification: FanRemixContestEndingSoonNotificationType
}

export const FanRemixContestEndingSoonNotification = (
  props: FanRemixContestEndingSoonNotificationProps
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
      </NotificationText>
    </NotificationTile>
  )
}
