import { useCallback } from 'react'

import { useNotificationEntity } from '@audius/common/api'
import {
  ArtistRemixContestEndingSoonNotification as ArtistRemixContestEndingSoonNotificationType,
  TrackEntity
} from '@audius/common/store'
import { Flex, IconTrophy, Text } from '@audius/harmony'
import { useDispatch } from 'react-redux'

import { TrackLink } from 'components/link'
import { push } from 'utils/navigation'

import { NotificationBody } from './components/NotificationBody'
import { NotificationFooter } from './components/NotificationFooter'
import { NotificationHeader } from './components/NotificationHeader'
import { NotificationTile } from './components/NotificationTile'
import { NotificationTitle } from './components/NotificationTitle'
import { getEntityLink } from './utils'

const messages = {
  title: 'Remix Contest',
  description1: `Your remix contest for `,
  description2: ` is ending in 48 hours!`
}

type ArtistRemixContestEndingSoonNotificationProps = {
  notification: ArtistRemixContestEndingSoonNotificationType
}

export const ArtistRemixContestEndingSoonNotification = (
  props: ArtistRemixContestEndingSoonNotificationProps
) => {
  const { notification } = props
  const { timeLabel, isViewed } = notification
  const dispatch = useDispatch()

  const entity = useNotificationEntity(notification) as TrackEntity | null

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
      <Flex>
        <NotificationBody>
          <Text variant='body' size='l'>
            {messages.description1}
            <TrackLink
              css={{ display: 'inline' }}
              variant='secondary'
              size='l'
              trackId={entity.track_id}
            />
            {messages.description2}
          </Text>
        </NotificationBody>
      </Flex>
      <NotificationFooter timeLabel={timeLabel} isViewed={isViewed} />
    </NotificationTile>
  )
}
