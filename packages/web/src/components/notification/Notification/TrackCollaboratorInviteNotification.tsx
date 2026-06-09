import { MouseEvent, useCallback } from 'react'

import {
  useTrack,
  useUser,
  useAcceptTrackCollaboration,
  useRejectTrackCollaboration
} from '@audius/common/api'
import { TrackCollaboratorInviteNotification as TrackCollaboratorInviteNotificationType } from '@audius/common/store'
import { Button, Flex, IconUserArrowRotate } from '@audius/harmony'
import { useDispatch } from 'react-redux'

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
  accept: 'Accept',
  decline: 'Decline'
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
  const { data: inviter } = useUser(inviterUserId)
  const { data: track } = useTrack(trackId)
  const { mutate: acceptCollaboration } = useAcceptTrackCollaboration()
  const { mutate: rejectCollaboration } = useRejectTrackCollaboration()

  const handleClick = useCallback(() => {
    if (track?.permalink) {
      dispatch(push(track.permalink))
    }
  }, [dispatch, track?.permalink])

  const handleAccept = useCallback(
    (e: MouseEvent) => {
      e.stopPropagation()
      acceptCollaboration({ trackId })
    },
    [acceptCollaboration, trackId]
  )

  const handleDecline = useCallback(
    (e: MouseEvent) => {
      e.stopPropagation()
      rejectCollaboration({ trackId })
    },
    [rejectCollaboration, trackId]
  )

  if (!inviter || !track) return null

  return (
    <NotificationTile notification={notification} onClick={handleClick}>
      <NotificationHeader
        icon={<IconUserArrowRotate color='accent' size='2xl' />}
      >
        <NotificationTitle>{messages.title}</NotificationTitle>
      </NotificationHeader>
      <NotificationBody>
        <UserNameLink user={inviter} notification={notification} />{' '}
        {messages.invitedYou} {track.title}.
      </NotificationBody>
      <Flex gap='s' pt='s'>
        <Button variant='primary' size='small' onClick={handleAccept}>
          {messages.accept}
        </Button>
        <Button variant='secondary' size='small' onClick={handleDecline}>
          {messages.decline}
        </Button>
      </Flex>
      <NotificationFooter timeLabel={timeLabel} isViewed={isViewed} />
    </NotificationTile>
  )
}
