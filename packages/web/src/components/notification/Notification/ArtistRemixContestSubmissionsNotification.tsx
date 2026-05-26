import { useCallback } from 'react'

import { useNotificationEntity } from '@audius/common/api'
import {
  ArtistRemixContestSubmissionsNotification as ArtistRemixContestSubmissionsNotificationType,
  TrackEntity
} from '@audius/common/store'
import { IconTrophy } from '@audius/harmony'
import { useDispatch } from 'react-redux'

import { TrackLink } from 'components/link'
import { push } from 'utils/navigation'
import { contestPage } from 'utils/route'

import { NotificationBody } from './components/NotificationBody'
import { NotificationFooter } from './components/NotificationFooter'
import { NotificationHeader } from './components/NotificationHeader'
import { NotificationTile } from './components/NotificationTile'
import { NotificationTitle } from './components/NotificationTitle'

const messages = {
  title: 'New Remix Submission!',
  description: 'Your remix contest for ',
  firstSubmission: ' received its first submission!',
  description2: (milestone: number) =>
    ` has received ${milestone} submissions!`,
  fallbackFirstSubmission: 'Your remix contest received its first submission!',
  fallbackMilestone: (milestone: number) =>
    `Your remix contest has received ${milestone} submissions!`
}

type ArtistRemixContestSubmissionsNotificationProps = {
  notification: ArtistRemixContestSubmissionsNotificationType
}

export const ArtistRemixContestSubmissionsNotification = ({
  notification
}: ArtistRemixContestSubmissionsNotificationProps) => {
  const { milestone, timeLabel, isViewed } = notification
  const dispatch = useDispatch()
  const entity = useNotificationEntity(notification) as TrackEntity | null

  const handleClick = useCallback(() => {
    if (entity) {
      dispatch(push(contestPage(entity.permalink)))
    }
  }, [entity, dispatch])

  return (
    <NotificationTile
      notification={notification}
      onClick={entity ? handleClick : undefined}
    >
      <NotificationHeader icon={<IconTrophy color='accent' />}>
        <NotificationTitle>{messages.title}</NotificationTitle>
      </NotificationHeader>
      <NotificationBody>
        {entity ? (
          <>
            {messages.description}
            <TrackLink
              css={{ display: 'inline' }}
              variant='secondary'
              size='l'
              trackId={entity.track_id}
            />
            {milestone === 1
              ? messages.firstSubmission
              : messages.description2(milestone)}
          </>
        ) : milestone === 1 ? (
          messages.fallbackFirstSubmission
        ) : (
          messages.fallbackMilestone(milestone)
        )}
      </NotificationBody>
      <NotificationFooter timeLabel={timeLabel} isViewed={isViewed} />
    </NotificationTile>
  )
}
