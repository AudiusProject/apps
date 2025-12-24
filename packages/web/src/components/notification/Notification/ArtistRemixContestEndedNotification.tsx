import { useCallback } from 'react'

import { useNotificationEntity, useRemixes } from '@audius/common/api'
import {
  ArtistRemixContestEndedNotification as ArtistRemixContestEndedNotificationType,
  TrackEntity
} from '@audius/common/store'
import { Button, Flex, IconTrophy } from '@audius/harmony'
import { useDispatch } from 'react-redux'
import { Link } from 'react-router'

import { push } from 'utils/navigation'
import { pickWinnersPage } from 'utils/route'

import { NotificationBody } from './components/NotificationBody'
import { NotificationFooter } from './components/NotificationFooter'
import { NotificationHeader } from './components/NotificationHeader'
import { NotificationTile } from './components/NotificationTile'
import { NotificationTitle } from './components/NotificationTitle'
import { getEntityLink } from './utils'

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
  const { data: remixes } = useRemixes({
    trackId: entity?.track_id,
    isContestEntry: true
  })

  const remixCount = remixes?.pages[0]?.count ?? 0

  const pickWinnersRoute = entity ? pickWinnersPage(entity?.permalink) : ''

  const handleClick = useCallback(() => {
    if (entity) {
      dispatch(push(getEntityLink(entity)))
    }
  }, [entity, dispatch])

  if (!entity) return null

  return (
    <NotificationTile notification={notification} onClick={handleClick}>
      <NotificationHeader icon={<IconTrophy color='accent' />}>
        <NotificationTitle>{messages.title}</NotificationTitle>
      </NotificationHeader>
      <Flex column gap='l'>
        <NotificationBody>{messages.pickWinnersDescription}</NotificationBody>
        {remixCount > 0 && (
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
