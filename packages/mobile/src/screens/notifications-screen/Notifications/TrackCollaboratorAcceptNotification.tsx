import { useCallback } from 'react'

import { useTrack, useUser } from '@audius/common/api'
import type { TrackCollaboratorAcceptNotification as TrackCollaboratorAcceptNotificationType } from '@audius/common/store'
import { View } from 'react-native'

import { IconUserArrowRotate } from '@audius/harmony-native'
import { useNotificationNavigation } from 'app/hooks/useNotificationNavigation'

import {
  NotificationHeader,
  NotificationProfilePicture,
  NotificationText,
  NotificationTile,
  NotificationTitle,
  UserNameLink
} from '../Notification'

const messages = {
  title: 'Collaboration Accepted',
  accepted: 'accepted your invitation to collaborate on',
  aTrack: 'a track'
}

type TrackCollaboratorAcceptNotificationProps = {
  notification: TrackCollaboratorAcceptNotificationType
}

export const TrackCollaboratorAcceptNotification = (
  props: TrackCollaboratorAcceptNotificationProps
) => {
  const { notification } = props
  const navigation = useNotificationNavigation()

  const { data: collaborator } = useUser(notification.collaboratorUserId)
  const { data: track } = useTrack(notification.trackId)

  const handlePress = useCallback(() => {
    navigation.navigate(notification)
  }, [navigation, notification])

  if (!collaborator) return null

  return (
    <NotificationTile notification={notification} onPress={handlePress}>
      <NotificationHeader icon={IconUserArrowRotate}>
        <NotificationTitle>{messages.title}</NotificationTitle>
      </NotificationHeader>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <NotificationProfilePicture profile={collaborator} />
        <NotificationText style={{ flexShrink: 1 }}>
          <UserNameLink user={collaborator} /> {messages.accepted}{' '}
          {track?.title ?? messages.aTrack}.
        </NotificationText>
      </View>
    </NotificationTile>
  )
}
