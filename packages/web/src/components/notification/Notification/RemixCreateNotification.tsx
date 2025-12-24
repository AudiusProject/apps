import { useCallback, useMemo } from 'react'

import { useTrack, useUser } from '@audius/common/api'
import { Name, TrackMetadata } from '@audius/common/models'
import { RemixCreateNotification as RemixCreateNotificationType } from '@audius/common/store'
import { useNavigate } from 'react-router'

import { make } from 'common/store/analytics/actions'
import { XShareButton } from 'components/x-share-button/XShareButton'

import { EntityLink } from './components/EntityLink'
import { NotificationBody } from './components/NotificationBody'
import { NotificationFooter } from './components/NotificationFooter'
import { NotificationHeader } from './components/NotificationHeader'
import { NotificationTile } from './components/NotificationTile'
import { NotificationTitle } from './components/NotificationTitle'
import { UserNameLink } from './components/UserNameLink'
import { IconRemix } from './components/icons'
import { getEntityLink } from './utils'

const messages = {
  title: 'New remix of your track',
  by: 'by',
  shareXText: (track: TrackMetadata, handle: string) =>
    `New remix of ${track.title} by ${handle} on @audius $AUDIO`
}

type RemixCreateNotificationProps = {
  notification: RemixCreateNotificationType
}

export const RemixCreateNotification = (
  props: RemixCreateNotificationProps
) => {
  const { notification } = props
  const { entityType, timeLabel, isViewed, childTrackId, parentTrackId } =
    notification
  const navigate = useNavigate()
  const { data: user } = useUser(notification.userId)

  // useNotificationEntities is not used here because the ids are not in the
  // entities list and we need to fetch them directly
  const { data: childTrack } = useTrack(childTrackId)
  const { data: parentTrack } = useTrack(parentTrackId)

  // unnecessary but makes types happy
  const childTrackEntity = useMemo(
    () =>
      childTrack && user
        ? {
            ...childTrack,
            user
          }
        : null,
    [childTrack, user]
  )

  const handleClick = useCallback(() => {
    if (childTrackEntity) {
      navigate(getEntityLink(childTrackEntity))
    }
  }, [childTrackEntity, navigate])

  const handleShare = useCallback(
    (twitterHandle: string) => {
      if (!parentTrack) return null
      const shareText = messages.shareXText(parentTrack, twitterHandle)
      const analytics = make(
        Name.NOTIFICATIONS_CLICK_REMIX_CREATE_TWITTER_SHARE,
        { text: shareText }
      )
      return { shareText, analytics }
    },
    [parentTrack]
  )

  if (!user || !parentTrack || !childTrackEntity) return null

  return (
    <NotificationTile notification={notification} onClick={handleClick}>
      <NotificationHeader icon={<IconRemix />}>
        <NotificationTitle>{messages.title}</NotificationTitle>
      </NotificationHeader>
      <NotificationBody>
        <EntityLink entity={childTrackEntity} entityType={entityType} />{' '}
        {messages.by} <UserNameLink user={user} notification={notification} />
      </NotificationBody>
      <XShareButton
        type='dynamic'
        handle={user.handle}
        url={getEntityLink(parentTrack, true)}
        shareData={handleShare}
      />
      <NotificationFooter timeLabel={timeLabel} isViewed={isViewed} />
    </NotificationTile>
  )
}
