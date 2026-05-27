import { useCallback } from 'react'

import { useNotificationEntity, useUser } from '@audius/common/api'
import {
  FanRemixContestStartedNotification as FanRemixContestStartedNotificationType,
  TrackEntity
} from '@audius/common/store'
import { Flex, IconTrophy } from '@audius/harmony'
import { useDispatch } from 'react-redux'

import { TrackLink } from 'components/link'
import { push } from 'utils/navigation'
import { contestPage } from 'utils/route'

import { NotificationBody } from './components/NotificationBody'
import { NotificationFooter } from './components/NotificationFooter'
import { NotificationHeader } from './components/NotificationHeader'
import { NotificationTile } from './components/NotificationTile'
import { NotificationTitle } from './components/NotificationTitle'
import { TrackContent } from './components/TrackContent'
import { UserNameLink } from './components/UserNameLink'

const messages = {
  title: 'New Remix Contest',
  description: 'started a new remix contest for ',
  fallbackWithUser: ' started a new remix contest.',
  fallbackGeneric: 'A new remix contest has started.'
}

type FanRemixContestStartedNotificationProps = {
  notification: FanRemixContestStartedNotificationType
}

export const FanRemixContestStartedNotification = (
  props: FanRemixContestStartedNotificationProps
) => {
  const { notification } = props
  const { timeLabel, isViewed, entityUserId } = notification
  const dispatch = useDispatch()

  const entity = useNotificationEntity(notification) as TrackEntity | null
  // Fallback host lookup so the row still renders if the contest's track
  // has been deleted; the entity hook returns null in that case.
  const { data: hostUser } = useUser(entity ? null : entityUserId)
  const host = entity?.user ?? hostUser ?? null

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
      {entity && entity.user ? (
        <Flex alignItems='flex-start'>
          <TrackContent track={entity} hideTitle />
          <NotificationBody>
            <UserNameLink user={entity.user} notification={notification} />{' '}
            {messages.description}
            <TrackLink
              css={{ display: 'inline' }}
              variant='secondary'
              size='l'
              trackId={entity.track_id}
            />
          </NotificationBody>
        </Flex>
      ) : (
        <NotificationBody>
          {host ? (
            <>
              <UserNameLink user={host} notification={notification} />
              {messages.fallbackWithUser}
            </>
          ) : (
            messages.fallbackGeneric
          )}
        </NotificationBody>
      )}
      <NotificationFooter timeLabel={timeLabel} isViewed={isViewed} />
    </NotificationTile>
  )
}
