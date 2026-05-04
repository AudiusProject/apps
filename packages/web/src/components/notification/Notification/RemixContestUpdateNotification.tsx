import { useCallback } from 'react'

import { useNotificationEntity } from '@audius/common/api'
import {
  RemixContestUpdateNotification as RemixContestUpdateNotificationType,
  TrackEntity
} from '@audius/common/store'
import { Flex, IconTrophy } from '@audius/harmony'
import { useDispatch } from 'react-redux'

import { TextLink } from 'components/link/TextLink'
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
  title: 'Contest update',
  description: 'posted an update in '
}

type RemixContestUpdateNotificationProps = {
  notification: RemixContestUpdateNotificationType
}

export const RemixContestUpdateNotification = (
  props: RemixContestUpdateNotificationProps
) => {
  const { notification } = props
  const { timeLabel, isViewed } = notification
  const dispatch = useDispatch()

  const entity = useNotificationEntity(notification) as TrackEntity | null

  const handleClick = useCallback(() => {
    if (entity) {
      dispatch(push(contestPage(entity.permalink)))
    }
  }, [entity, dispatch])

  if (!entity || !entity.user) return null

  return (
    <NotificationTile notification={notification} onClick={handleClick}>
      <NotificationHeader icon={<IconTrophy color='accent' />}>
        <NotificationTitle>{messages.title}</NotificationTitle>
      </NotificationHeader>
      <Flex alignItems='flex-start'>
        <TrackContent track={entity} hideTitle />
        <NotificationBody>
          <UserNameLink user={entity.user} notification={notification} />{' '}
          {messages.description}
          <TextLink
            css={{ display: 'inline' }}
            variant='secondary'
            size='l'
            to={contestPage(entity.permalink)}
          >
            {entity.title}
          </TextLink>
        </NotificationBody>
      </Flex>
      <NotificationFooter timeLabel={timeLabel} isViewed={isViewed} />
    </NotificationTile>
  )
}
