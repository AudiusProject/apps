import { MouseEvent, useCallback, useContext, useEffect } from 'react'

import {
  useTrack,
  useUser,
  useAcceptTrackCollaboration,
  useCurrentUserId,
  useRejectTrackCollaboration,
  useTrackCollaborationStatus
} from '@audius/common/api'
import { useAcceptedTrackCollaborationInvite } from '@audius/common/hooks'
import { TrackCollaboratorInviteNotification as TrackCollaboratorInviteNotificationType } from '@audius/common/store'
import { isTrackCollaborationAccepted } from '@audius/common/utils'
import { Button, Flex, IconUserArrowRotate } from '@audius/harmony'
import { useDispatch } from 'react-redux'

import { ToastContext } from 'components/toast/ToastContext'
import { push } from 'utils/navigation'

import { NotificationBody } from './components/NotificationBody'
import { NotificationFooter } from './components/NotificationFooter'
import { NotificationHeader } from './components/NotificationHeader'
import { NotificationTile } from './components/NotificationTile'
import { NotificationTitle } from './components/NotificationTitle'
import { UserNameLink } from './components/UserNameLink'

const messages = {
  title: 'Track Collaboration Invite',
  invitedYou: 'invited you to collaborate on',
  // The track may be private — a pending collaborator can't load it yet, so fall
  // back to a generic noun rather than blocking the whole notification.
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
  const { timeLabel, isViewed, trackId, inviterUserId } = notification
  const dispatch = useDispatch()
  const { toast } = useContext(ToastContext)
  const { data: inviter } = useUser(inviterUserId)
  const { data: currentUserId } = useCurrentUserId()
  const { isMarkedAccepted, markAccepted } =
    useAcceptedTrackCollaborationInvite(currentUserId, trackId)
  const {
    data: isCollaborationAccepted,
    isPending: isCollaborationStatusPending
  } = useTrackCollaborationStatus(trackId, currentUserId)
  // Best-effort: private tracks won't load for a pending collaborator.
  const { data: track } = useTrack(trackId)
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

  const handleClick = useCallback(() => {
    if (track?.permalink) {
      dispatch(push(track.permalink))
    }
  }, [dispatch, track?.permalink])

  const handleAccept = useCallback(
    (e: MouseEvent) => {
      e.stopPropagation()
      acceptCollaboration(
        { trackId },
        {
          onSuccess: () => {
            markAccepted()
            toast(messages.accepted)
          },
          onError: () => toast(messages.error)
        }
      )
    },
    [acceptCollaboration, markAccepted, trackId, toast]
  )

  const handleDecline = useCallback(
    (e: MouseEvent) => {
      e.stopPropagation()
      rejectCollaboration(
        { trackId },
        {
          onSuccess: () => toast(messages.declined),
          onError: () => toast(messages.error)
        }
      )
    },
    [rejectCollaboration, trackId, toast]
  )

  // Only the inviter (a public user) is required to render; the track itself
  // may be unavailable (private) without breaking accept/decline, which act on
  // the trackId carried by the notification.
  if (!inviter) return null

  return (
    <NotificationTile notification={notification} onClick={handleClick}>
      <NotificationHeader
        icon={<IconUserArrowRotate color='accent' size='2xl' />}
      >
        <NotificationTitle>{messages.title}</NotificationTitle>
      </NotificationHeader>
      <NotificationBody>
        <UserNameLink user={inviter} notification={notification} />{' '}
        {messages.invitedYou} {track?.title ?? messages.aTrack}.
      </NotificationBody>
      <Flex gap='s' pt='s'>
        <Button
          variant='primary'
          size='small'
          onClick={isAccepted ? undefined : handleAccept}
          disabled={isAccepted || isSubmitting || isCheckingAccepted}
        >
          {isAccepted ? messages.acceptedButton : messages.accept}
        </Button>
        {isAccepted || isCheckingAccepted ? null : (
          <Button
            variant='secondary'
            size='small'
            onClick={handleDecline}
            disabled={isSubmitting}
          >
            {messages.decline}
          </Button>
        )}
      </Flex>
      <NotificationFooter timeLabel={timeLabel} isViewed={isViewed} />
    </NotificationTile>
  )
}
