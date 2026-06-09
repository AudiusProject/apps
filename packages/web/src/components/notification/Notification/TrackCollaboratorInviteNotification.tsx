import { MouseEvent, useCallback, useContext } from 'react'

import {
  useTrack,
  useUser,
  useAcceptTrackCollaboration,
  useRejectTrackCollaboration
} from '@audius/common/api'
import { TrackCollaboratorInviteNotification as TrackCollaboratorInviteNotificationType } from '@audius/common/store'
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
  // Best-effort: private tracks won't load for a pending collaborator.
  const { data: track } = useTrack(trackId)
  const { mutate: acceptCollaboration, isPending: isAccepting } =
    useAcceptTrackCollaboration()
  const { mutate: rejectCollaboration, isPending: isDeclining } =
    useRejectTrackCollaboration()
  const isSubmitting = isAccepting || isDeclining

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
          onSuccess: () => toast(messages.accepted),
          onError: () => toast(messages.error)
        }
      )
    },
    [acceptCollaboration, trackId, toast]
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
          onClick={handleAccept}
          disabled={isSubmitting}
        >
          {messages.accept}
        </Button>
        <Button
          variant='secondary'
          size='small'
          onClick={handleDecline}
          disabled={isSubmitting}
        >
          {messages.decline}
        </Button>
      </Flex>
      <NotificationFooter timeLabel={timeLabel} isViewed={isViewed} />
    </NotificationTile>
  )
}
