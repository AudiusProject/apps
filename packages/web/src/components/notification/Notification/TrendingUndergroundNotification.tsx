import { useCallback } from 'react'

import { useNotificationEntity } from '@audius/common/api'
import { Name } from '@audius/common/models'
import {
  TrackEntity,
  TrendingUndergroundNotification as TrendingUndergroundNotificationType
} from '@audius/common/store'
import { useDispatch } from 'react-redux'

import { make } from 'common/store/analytics/actions'
import { push } from 'utils/navigation'

import { EntityLink } from './components/EntityLink'
import { NotificationBody } from './components/NotificationBody'
import { NotificationFooter } from './components/NotificationFooter'
import { NotificationHeader } from './components/NotificationHeader'
import { NotificationTile } from './components/NotificationTile'
import { NotificationTitle } from './components/NotificationTitle'
import { TwitterShareButton } from './components/TwitterShareButton'
import { IconTrending } from './components/icons'
import { getEntityLink } from './utils'

const messages = {
  title: "You're Trending",
  is: 'is',
  trending: 'on Underground Trending right now!',
  twitterShareText: (entityTitle: string) =>
    `My track ${entityTitle} made it to the top of underground trending on @audius! Check it out! #Audius #AudiusTrending $AUDIO `
}

type TrendingUndergroundNotificationProps = {
  notification: TrendingUndergroundNotificationType
}

export const TrendingUndergroundNotification = (
  props: TrendingUndergroundNotificationProps
) => {
  const { notification } = props
  const { entityType, rank, timeLabel, isViewed } = notification
  const dispatch = useDispatch()

  const entity = useNotificationEntity(notification)

  const handleClick = useCallback(() => {
    if (entity) {
      dispatch(push(getEntityLink(entity)))
    }
  }, [dispatch, entity])

  if (!entity) return null

  const shareText = messages.twitterShareText((entity as TrackEntity).title)

  return (
    <NotificationTile notification={notification} onClick={handleClick}>
      <NotificationHeader icon={<IconTrending />}>
        <NotificationTitle>{messages.title}</NotificationTitle>
      </NotificationHeader>
      <NotificationBody>
        <EntityLink entity={entity} entityType={entityType} /> {messages.is} #
        {rank} {messages.trending}
      </NotificationBody>
      <TwitterShareButton
        type='static'
        url={getEntityLink(entity, true)}
        shareText={shareText}
        analytics={make(
          Name.NOTIFICATIONS_CLICK_TRENDING_UNDERGROUND_TWITTER_SHARE,
          {
            text: shareText
          }
        )}
      />
      <NotificationFooter timeLabel={timeLabel} isViewed={isViewed} />
    </NotificationTile>
  )
}
