import { useCallback } from 'react'

import { useNotificationEntities } from '@audius/common/api'
import { Name, Track } from '@audius/common/models'
import {
  Entity,
  CollectionEntity,
  AddTrackToPlaylistNotification as AddTrackToPlaylistNotificationType
} from '@audius/common/store'
import { Flex } from '@audius/harmony'
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
import { ProfilePicture } from './components/ProfilePicture'
import { UserNameLink } from './components/UserNameLink'
import { IconAddTrackToPlaylist } from './components/icons'
import { getEntityLink } from './utils'

const messages = {
  title: 'Track Added to Playlist',
  shareXText: (handle: string, track: Track, playlist: CollectionEntity) =>
    `My track ${track.title} was added to the playlist ${playlist.playlist_name} by ${handle} on @audius! $AUDIO`
}

type AddTrackToPlaylistNotificationProps = {
  notification: AddTrackToPlaylistNotificationType
}

export const AddTrackToPlaylistNotification = (
  props: AddTrackToPlaylistNotificationProps
) => {
  const { notification } = props
  const { timeLabel, isViewed } = notification
  const entities = useNotificationEntities(notification)
  const { track, playlist } = entities
  const playlistOwner = playlist?.user

  const dispatch = useDispatch()

  const handleXShare = useCallback(
    (playlistOwnerHandle: string) => {
      if (!track || !playlist) return null
      const shareText = messages.shareXText(
        playlistOwnerHandle,
        track as Track,
        playlist as CollectionEntity
      )
      const analytics = make(
        Name.NOTIFICATIONS_CLICK_ADD_TRACK_TO_PLAYLIST_TWITTER_SHARE,
        { text: shareText }
      )
      return { shareText, analytics }
    },
    [track, playlist]
  )

  const handleClick = useCallback(() => {
    if (playlist) {
      dispatch(push(getEntityLink(playlist)))
    }
  }, [playlist, dispatch])

  if (!playlistOwner || !track || !playlist) return null

  return (
    <NotificationTile notification={notification} onClick={handleClick}>
      <NotificationHeader icon={<IconAddTrackToPlaylist />}>
        <NotificationTitle>{messages.title}</NotificationTitle>
      </NotificationHeader>
      <Flex as={NotificationBody} alignItems='center' gap='s'>
        <ProfilePicture user={playlistOwner} />
        <span>
          <UserNameLink user={playlistOwner} notification={notification} />
          {' added your track '}
          <EntityLink entity={track} entityType={Entity.Track} />
          {' to their playlist '}
          <EntityLink entity={playlist} entityType={Entity.Playlist} />
        </span>
      </Flex>
      <XShareButton
        type='dynamic'
        handle={playlistOwner.handle}
        shareData={handleXShare}
        url={getEntityLink(playlist, true)}
      />
      <NotificationFooter timeLabel={timeLabel} isViewed={isViewed} />
    </NotificationTile>
  )
}
