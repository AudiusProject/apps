import { ShareToTwitter } from '@audius/common/models'
import { ShareContent } from '@audius/common/store'
import { getXShareHandle } from '@audius/common/utils'

import { fullCollectionPage, fullProfilePage, fullTrackPage } from 'utils/route'

import { messages } from './messages'

type ShareToTwitterEvent = Omit<ShareToTwitter, 'eventName' | 'source'>

type ShareMessageConfig = Pick<
  typeof messages,
  'profileShareText' | 'trackShareText' | 'playlistShareText' | 'albumShareText'
>

export const getXShareText = async (
  content: ShareContent,
  isPlaylistOwner = false,
  messageConfig: ShareMessageConfig = messages
) => {
  let xText = ''
  let link = ''
  let analyticsEvent: ShareToTwitterEvent
  switch (content.type) {
    case 'track': {
      const {
        track: { title, permalink, track_id },
        artist
      } = content
      xText = messageConfig.trackShareText(title, getXShareHandle(artist))
      link = fullTrackPage(permalink)
      analyticsEvent = { kind: 'track', id: track_id, url: link }
      break
    }
    case 'profile': {
      const { profile } = content
      xText = messageConfig.profileShareText(getXShareHandle(profile))
      link = fullProfilePage(profile.handle)
      analyticsEvent = { kind: 'profile', id: profile.user_id, url: link }
      break
    }
    case 'album': {
      const {
        album: { playlist_name, playlist_id, permalink },
        artist
      } = content
      xText = messageConfig.albumShareText(
        playlist_name,
        getXShareHandle(artist)
      )
      link = fullCollectionPage(
        artist.handle,
        playlist_name,
        playlist_id,
        permalink,
        true
      )
      analyticsEvent = { kind: 'album', id: playlist_id, url: link }
      break
    }
    case 'playlist': {
      const {
        playlist: { playlist_name, playlist_id, permalink, is_album },
        creator
      } = content
      xText = messageConfig.playlistShareText(
        playlist_name,
        getXShareHandle(creator)
      )
      link = fullCollectionPage(
        creator.handle,
        playlist_name,
        playlist_id,
        permalink,
        is_album
      )
      analyticsEvent = { kind: 'playlist', id: playlist_id, url: link }
      break
    }
  }

  return { xText, link, analyticsEvent }
}
