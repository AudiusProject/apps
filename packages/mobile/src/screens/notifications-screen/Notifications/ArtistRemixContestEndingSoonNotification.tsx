import { useCallback } from 'react'

import { useTrack, useUser } from '@audius/common/api'
import type { ArtistRemixContestEndingSoonNotification as ArtistRemixContestEndingSoonNotificationType } from '@audius/common/store'

import { IconTrophy } from '@audius/harmony-native'
import { useNavigation } from 'app/hooks/useNavigation'

import {
  NotificationHeader,
  NotificationText,
  NotificationTile,
  NotificationTitle,
  EntityLink
} from '../Notification'

const messages = {
  title: 'Remix Contest',
  description1: `Your remix contest for `,
  description2: ` is ending in 48 hours!`
}

type ArtistRemixContestEndingSoonNotificationProps = {
  notification: ArtistRemixContestEndingSoonNotificationType
}

export const ArtistRemixContestEndingSoonNotification = (
  props: ArtistRemixContestEndingSoonNotificationProps
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
        {messages.description1}
        <EntityLink entity={track} /> {messages.description2}
      </NotificationText>
    </NotificationTile>
  )
}
