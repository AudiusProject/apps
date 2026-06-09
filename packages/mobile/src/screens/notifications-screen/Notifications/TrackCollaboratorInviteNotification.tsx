import { useCallback } from 'react'

import { useTrack, useUser } from '@audius/common/api'
import type { TrackCollaboratorInviteNotification as TrackCollaboratorInviteNotificationType } from '@audius/common/store'
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
  title: 'Track Collaboration Invite',
  invitedYou: 'invited you to collaborate on'
}

type TrackCollaboratorInviteNotificationProps = {
  notification: TrackCollaboratorInviteNotificationType
}

export const TrackCollaboratorInviteNotification = (
  props: TrackCollaboratorInviteNotificationProps
) => {
  const { notification } = props
  const navigation = useNotificationNavigation()

  const { data: inviter } = useUser(notification.inviterUserId)
  const { data: track } = useTrack(notification.trackId)

  const handlePress = useCallback(() => {
    navigation.navigate(notification)
  }, [navigation, notification])

  if (!inviter || !track) return null

  return (
    <NotificationTile notification={notification} onPress={handlePress}>
      <NotificationHeader icon={IconUserArrowRotate}>
        <NotificationTitle>{messages.title}</NotificationTitle>
      </NotificationHeader>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <NotificationProfilePicture profile={inviter} />
        <NotificationText style={{ flexShrink: 1 }}>
          <UserNameLink user={inviter} /> {messages.invitedYou} {track.title}.
        </NotificationText>
      </View>
    </NotificationTile>
  )
}
