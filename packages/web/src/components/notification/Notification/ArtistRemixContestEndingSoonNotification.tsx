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
import { contestPage } from 'utils/route'

import { NotificationBody } from './components/NotificationBody'
import { NotificationFooter } from './components/NotificationFooter'
import { NotificationHeader } from './components/NotificationHeader'
import { NotificationTile } from './components/NotificationTile'
import { NotificationTitle } from './components/NotificationTitle'

const messages = {
  title: 'Remix Contest',
  description1: `Your remix contest for `,
  description2: ` is ending in 48 hours!`,
  fallbackDescription: 'Your remix contest is ending in 48 hours!'
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
      <Flex>
        <NotificationBody>
          <Text variant='body' size='l'>
            {entity ? (
              <>
                {messages.description1}
                <TrackLink
                  css={{ display: 'inline' }}
                  variant='secondary'
                  size='l'
                  trackId={entity.track_id}
                />
                {messages.description2}
              </>
            ) : (
              messages.fallbackDescription
            )}
          </Text>
        </NotificationBody>
      </Flex>
      <NotificationFooter timeLabel={timeLabel} isViewed={isViewed} />
    </NotificationTile>
  )
}
