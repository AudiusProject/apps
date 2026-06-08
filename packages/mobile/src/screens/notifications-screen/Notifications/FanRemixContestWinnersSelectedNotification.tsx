import { useCallback } from 'react'

import { useTrack, useUser } from '@audius/common/api'
import type { FanRemixContestWinnersSelectedNotification as FanRemixContestWinnersSelectedNotificationType } from '@audius/common/store'

import { IconTrophy, Text } from '@audius/harmony-native'
import { useNavigation } from 'app/hooks/useNavigation'

import {
  NotificationHeader,
  NotificationText,
  NotificationTile,
  NotificationTitle,
  UserNameLink
} from '../Notification'

const messages = {
  title: 'Remix Contest Winners',
  description: ' has picked winners for their remix contest!'
}

type FanRemixContestWinnersSelectedNotificationProps = {
  notification: FanRemixContestWinnersSelectedNotificationType
}

export const FanRemixContestWinnersSelectedNotification = (
  props: FanRemixContestWinnersSelectedNotificationProps
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
        <UserNameLink user={user} />
        <Text variant='body' size='l'>
          {messages.description}
        </Text>
      </NotificationText>
    </NotificationTile>
  )
}
