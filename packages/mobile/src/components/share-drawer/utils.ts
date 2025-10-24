import type { ShareContent } from '@audius/common/store'
import { makeXShareUrl, getXShareHandle } from '@audius/common/utils'

import {
  getCollectionRoute,
  getTrackRoute,
  getUserRoute
} from 'app/utils/routes'

import { messages } from './messages'

export const getContentUrl = (content: ShareContent) => {
  switch (content.type) {
    case 'track': {
      const { track } = content
      return getTrackRoute(track, true)
    }
    case 'profile': {
      const { profile } = content
      return getUserRoute(profile, true)
    }
    case 'album': {
      const { album } = content
      return getCollectionRoute(album, true)
    }
    case 'playlist': {
      const { playlist } = content
      return getCollectionRoute(playlist, true)
    }
  }
}

export const getXShareText = async (content: ShareContent) => {
  switch (content.type) {
    case 'track': {
      const {
        track: { title },
        artist
      } = content
      return messages.trackShareText(title, getXShareHandle(artist))
    }
    case 'profile': {
      const { profile } = content
      return messages.profileShareText(getXShareHandle(profile))
    }
    case 'album': {
      const {
        album: { playlist_name },
        artist
      } = content
      return messages.albumShareText(playlist_name, getXShareHandle(artist))
    }
    case 'playlist': {
      const {
        playlist: { playlist_name },
        creator
      } = content
      return messages.playlistShareText(playlist_name, getXShareHandle(creator))
    }
  }
}

export const getXShareUrl = async (content: ShareContent) => {
  const url = getContentUrl(content)
  const shareText = await getXShareText(content)
  return makeXShareUrl(url ?? null, shareText)
}
