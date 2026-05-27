import { useCallback } from 'react'

import { useNotificationEntity, useUser } from '@audius/common/api'
import {
  FanRemixContestEndingSoonNotification as FanRemixContestEndingSoonNotificationType,
  TrackEntity
} from '@audius/common/store'
import { Flex, IconTrophy } from '@audius/harmony'
import { useDispatch } from 'react-redux'

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
  title: 'Remix Contest',
  description:
    " has a remix contest ending in 72 hours - don't forget to submit your remix",
  fallbackWithUser: ' has a remix contest ending soon.',
  fallbackGeneric: 'A remix contest is ending soon.'
}

type FanRemixContestEndingSoonNotificationProps = {
  notification: FanRemixContestEndingSoonNotificationType
}

export const FanRemixContestEndingSoonNotification = (
  props: FanRemixContestEndingSoonNotificationProps
) => {
  const { notification } = props
  const { timeLabel, isViewed, entityUserId } = notification
  const dispatch = useDispatch()

  const entity = useNotificationEntity(notification) as TrackEntity | null
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
