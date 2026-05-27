import { useCallback } from 'react'

import { useTrack } from '@audius/common/api'
import type { ArtistRemixContestEndedNotification as ArtistRemixContestEndedNotificationType } from '@audius/common/store'

import { IconTrophy } from '@audius/harmony-native'
import { useNavigation } from 'app/hooks/useNavigation'

import {
  NotificationHeader,
  NotificationText,
  NotificationTile,
  NotificationTitle
} from '../Notification'

const messages = {
  title: 'Your Remix Contest Ended',
  description:
    "Your remix contest has ended. Don't forget to contact your winners!"
}

type ArtistRemixContestEndedNotificationProps = {
  notification: ArtistRemixContestEndedNotificationType
}

export const ArtistRemixContestEndedNotification = (
  props: ArtistRemixContestEndedNotificationProps
) => {
  const { notification } = props
  const { entityId } = notification

  const navigation = useNavigation()
  const { data: track } = useTrack(entityId)

  const handlePress = useCallback(() => {
    if (track) {
      navigation.push('Contest', {
        trackId: track.track_id
      })
    }
  }, [track, navigation])

  if (!track) return null

  return (
    <NotificationTile notification={notification} onPress={handlePress}>
      <NotificationHeader icon={IconTrophy}>
        <NotificationTitle>{messages.title}</NotificationTitle>
      </NotificationHeader>
      <NotificationText>{messages.description}</NotificationText>
    </NotificationTile>
  )
}
