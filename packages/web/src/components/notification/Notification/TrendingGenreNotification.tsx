import { useCallback } from 'react'

import { useNotificationEntity } from '@audius/common/api'
import { useFeatureFlag } from '@audius/common/hooks'
import { trendingGenreNotificationMessages as messages } from '@audius/common/messages'
import { Name } from '@audius/common/models'
import { FeatureFlags } from '@audius/common/services'
import {
  TrackEntity,
  TrendingGenreNotification as TrendingGenreNotificationType
} from '@audius/common/store'
import { useDispatch } from 'react-redux'

import { make } from 'common/store/analytics/actions'
import { XShareButton } from 'components/x-share-button/XShareButton'
import { push } from 'utils/navigation'

import { EntityLink } from './components/EntityLink'
import { NotificationBody } from './components/NotificationBody'
import { NotificationFooter } from './components/NotificationFooter'
import { NotificationHeader } from './components/NotificationHeader'
import { NotificationTile } from './components/NotificationTile'
import { NotificationTitle } from './components/NotificationTitle'
import { IconTrending } from './components/icons'
import { getEntityLink } from './utils'

type TrendingGenreNotificationProps = {
  notification: TrendingGenreNotificationType
}

/**
 * The artist's track is in the top 10 of its genre's weekly chart (sent
 * Fridays). Hidden when the flag is off, since the server sends it regardless.
 */
export const TrendingGenreNotification = (
  props: TrendingGenreNotificationProps
) => {
  const { notification } = props
  const { entityType, rank, genre, timeLabel, isViewed } = notification
  const dispatch = useDispatch()
  const { isEnabled } = useFeatureFlag(FeatureFlags.TRENDING_GENRE_NOTIFICATION)

  const entity = useNotificationEntity(notification) as TrackEntity | null

  const handleClick = useCallback(() => {
    if (entity) {
      dispatch(push(getEntityLink(entity)))
    }
  }, [dispatch, entity])

  if (!isEnabled || !entity) return null

  const shareText = messages.xShareText(entity.title, rank, genre)

  return (
    <NotificationTile notification={notification} onClick={handleClick}>
      <NotificationHeader icon={<IconTrending />}>
        <NotificationTitle>{messages.title(genre)}</NotificationTitle>
      </NotificationHeader>
      <NotificationBody>
        <EntityLink entity={entity} entityType={entityType} /> {messages.is}{' '}
        {messages.inGenre(rank, genre)}
      </NotificationBody>
      <XShareButton
        type='static'
        url={getEntityLink(entity, true)}
        shareText={shareText}
        analytics={make(Name.NOTIFICATIONS_CLICK_TRENDING_TRACK_TWITTER_SHARE, {
          text: shareText
        })}
      />
      <NotificationFooter timeLabel={timeLabel} isViewed={isViewed} />
    </NotificationTile>
  )
}
