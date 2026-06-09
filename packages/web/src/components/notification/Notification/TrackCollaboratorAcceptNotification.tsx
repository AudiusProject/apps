import { useCallback } from 'react'

import { useTrack, useUser } from '@audius/common/api'
import { TrackCollaboratorAcceptNotification as TrackCollaboratorAcceptNotificationType } from '@audius/common/store'
import { IconUserArrowRotate } from '@audius/harmony'
import { useDispatch } from 'react-redux'

import { push } from 'utils/navigation'

import { NotificationBody } from './components/NotificationBody'
import { NotificationFooter } from './components/NotificationFooter'
import { NotificationHeader } from './components/NotificationHeader'
import { NotificationTile } from './components/NotificationTile'
import { NotificationTitle } from './components/NotificationTitle'
import { UserNameLink } from './components/UserNameLink'

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
  const { timeLabel, isViewed, trackId, collaboratorUserId } = notification
  const dispatch = useDispatch()
  const { data: collaborator } = useUser(collaboratorUserId)
  const { data: track } = useTrack(trackId)

  const handleClick = useCallback(() => {
    if (track?.permalink) {
      dispatch(push(track.permalink))
    }
  }, [dispatch, track?.permalink])

  if (!collaborator) return null

  return (
    <NotificationTile notification={notification} onClick={handleClick}>
      <NotificationHeader
        icon={<IconUserArrowRotate color='accent' size='2xl' />}
      >
        <NotificationTitle>{messages.title}</NotificationTitle>
      </NotificationHeader>
      <NotificationBody>
        <UserNameLink user={collaborator} notification={notification} />{' '}
        {messages.accepted} {track?.title ?? messages.aTrack}.
      </NotificationBody>
      <NotificationFooter timeLabel={timeLabel} isViewed={isViewed} />
    </NotificationTile>
  )
}
