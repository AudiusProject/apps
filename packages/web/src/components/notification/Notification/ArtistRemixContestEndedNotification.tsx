import { useCallback } from 'react'

import { useNotificationEntity, useRemixesCount } from '@audius/common/api'
import {
  ArtistRemixContestEndedNotification as ArtistRemixContestEndedNotificationType,
  TrackEntity
} from '@audius/common/store'
import { Button, Flex, IconTrophy } from '@audius/harmony'
import { useDispatch } from 'react-redux'
import { Link } from 'react-router'

import { push } from 'utils/navigation'
import { contestPage, pickWinnersPage } from 'utils/route'

import { NotificationBody } from './components/NotificationBody'
import { NotificationFooter } from './components/NotificationFooter'
import { NotificationHeader } from './components/NotificationHeader'
import { NotificationTile } from './components/NotificationTile'
import { NotificationTitle } from './components/NotificationTitle'

const messages = {
  title: 'Your Remix Contest Ended',
  description:
    "Your remix contest has ended. Don't forget to contact your winners!",
  pickWinnersDescription:
    "Your remix contest has ended. It's time to pick your winners!"
}

type ArtistRemixContestEndedNotificationProps = {
  notification: ArtistRemixContestEndedNotificationType
}

export const ArtistRemixContestEndedNotification = (
  props: ArtistRemixContestEndedNotificationProps
) => {
  const { notification } = props
  const { timeLabel, isViewed } = notification
  const dispatch = useDispatch()

  const entity = useNotificationEntity(notification) as TrackEntity | null
  const { data: remixCount = 0 } = useRemixesCount({
    trackId: entity?.track_id,
    isContestEntry: true
  })

  const pickWinnersRoute = entity ? pickWinnersPage(entity?.permalink) : ''

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
      <Flex column gap='l'>
        <NotificationBody>
          {entity ? messages.pickWinnersDescription : messages.description}
        </NotificationBody>
        {entity && remixCount > 0 && (
          <Button css={{ width: 'fit-content' }} size='small' asChild>
            <Link to={pickWinnersRoute} onClick={(e) => e.stopPropagation()}>
              Pick Winners
            </Link>
          </Button>
        )}
      </Flex>
      <NotificationFooter timeLabel={timeLabel} isViewed={isViewed} />
    </NotificationTile>
  )
}
