import { useCallback, useEffect } from 'react'

import {
  useAcceptTrackCollaboration,
  useCurrentUserId,
  useRejectTrackCollaboration,
  useTrack,
  useTrackCollaborationStatus,
  useUser
} from '@audius/common/api'
import { useAcceptedTrackCollaborationInvite } from '@audius/common/hooks'
import type { TrackCollaboratorInviteNotification as TrackCollaboratorInviteNotificationType } from '@audius/common/store'
import { isTrackCollaborationAccepted } from '@audius/common/utils'
import type { GestureResponderEvent } from 'react-native'
import { View } from 'react-native'

import { Button, Flex, IconUserArrowRotate } from '@audius/harmony-native'
import { useNotificationNavigation } from 'app/hooks/useNotificationNavigation'
import { useToast } from 'app/hooks/useToast'

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
  invitedYou: 'invited you to collaborate on',
  aTrack: 'a track',
  accept: 'Accept',
  decline: 'Decline',
  acceptedButton: 'Accepted',
  accepted: 'Collaboration accepted!',
  declined: 'Invitation declined',
  error: 'Something went wrong. Please try again.'
}

type TrackCollaboratorInviteNotificationProps = {
  notification: TrackCollaboratorInviteNotificationType
}

export const TrackCollaboratorInviteNotification = (
  props: TrackCollaboratorInviteNotificationProps
) => {
  const { notification } = props
  const navigation = useNotificationNavigation()
  const { toast } = useToast()

  const { data: inviter } = useUser(notification.inviterUserId)
  const { data: currentUserId } = useCurrentUserId()
  const { isMarkedAccepted, markAccepted } =
    useAcceptedTrackCollaborationInvite(currentUserId, notification.trackId)
  const {
    data: isCollaborationAccepted,
    isPending: isCollaborationStatusPending
  } = useTrackCollaborationStatus(notification.trackId, currentUserId)
  const { data: track } = useTrack(notification.trackId)
  const { mutate: acceptCollaboration, isPending: isAccepting } =
    useAcceptTrackCollaboration()
  const { mutate: rejectCollaboration, isPending: isDeclining } =
    useRejectTrackCollaboration()
  const isSubmitting = isAccepting || isDeclining
  const isAccepted =
    isMarkedAccepted ||
    isCollaborationAccepted ||
    isTrackCollaborationAccepted(track, currentUserId)
  const isCheckingAccepted =
    !!currentUserId && isCollaborationStatusPending && !isAccepted

  useEffect(() => {
    if (isCollaborationAccepted) {
      markAccepted()
    }
  }, [isCollaborationAccepted, markAccepted])

  const handlePress = useCallback(() => {
    navigation.navigate(notification)
  }, [navigation, notification])

  const handleAccept = useCallback(
    (event: GestureResponderEvent) => {
      event.stopPropagation()
      acceptCollaboration(
        { trackId: notification.trackId },
        {
          onSuccess: () => {
            markAccepted()
            toast({ content: messages.accepted })
          },
          onError: () => toast({ content: messages.error, type: 'error' })
        }
      )
    },
    [acceptCollaboration, markAccepted, notification.trackId, toast]
  )

  const handleDecline = useCallback(
    (event: GestureResponderEvent) => {
      event.stopPropagation()
      rejectCollaboration(
        { trackId: notification.trackId },
        {
          onSuccess: () => toast({ content: messages.declined }),
          onError: () => toast({ content: messages.error, type: 'error' })
        }
      )
    },
    [notification.trackId, rejectCollaboration, toast]
  )

  if (!inviter) return null

  return (
    <NotificationTile notification={notification} onPress={handlePress}>
      <NotificationHeader icon={IconUserArrowRotate}>
        <NotificationTitle>{messages.title}</NotificationTitle>
      </NotificationHeader>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <NotificationProfilePicture profile={inviter} />
        <NotificationText style={{ flexShrink: 1 }}>
          <UserNameLink user={inviter} /> {messages.invitedYou}{' '}
          {track?.title ?? messages.aTrack}.
        </NotificationText>
      </View>
      <Flex row gap='s' mt='xl' alignItems='flex-start'>
        <Button
          size='small'
          onPress={isAccepted ? undefined : handleAccept}
          disabled={isAccepted || isSubmitting || isCheckingAccepted}
          isLoading={isAccepting}
        >
          {isAccepted ? messages.acceptedButton : messages.accept}
        </Button>
        {isAccepted || isCheckingAccepted ? null : (
          <Button
            size='small'
            variant='secondary'
            onPress={handleDecline}
            disabled={isSubmitting}
            isLoading={isDeclining}
          >
            {messages.decline}
          </Button>
        )}
      </Flex>
    </NotificationTile>
  )
}
