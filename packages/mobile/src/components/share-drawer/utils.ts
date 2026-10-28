import type { ShareContent, ShareMilestoneStat } from '@audius/common/store'
import { makeXShareUrl, getXShareHandle } from '@audius/common/utils'

import {
  getCollectionRoute,
  getContestRoute,
  getTrackRoute,
  getUserRoute,
  getWeeklyRotationRoute
} from 'app/utils/routes'

import { messages } from './messages'

const formatStatCount = (count: number) => count.toLocaleString('en-US')

export const getStatHeadline = (stat: ShareMilestoneStat) => {
  switch (stat.kind) {
    case 'listens':
    case 'reposts':
    case 'favorites':
      return {
        value: formatStatCount(stat.count),
        label: messages.milestoneCountLabel[stat.kind]
      }
    case 'trending':
    case 'underground':
      return {
        value: `#${stat.rank}`,
        label: messages.milestoneRankLabel[stat.kind]
      }
  }
}

export const getContentUrl = (content: ShareContent) => {
  switch (content.type) {
    case 'track':
    case 'milestone': {
      const { track } = content
      return getTrackRoute(track, true)
    }
    case 'contest': {
      // Contest shares point at the parent track's contest page —
      // `{permalink}/contest` — so sharing copies the contest URL
      // rather than the underlying track.
      const { track } = content
      return getContestRoute(track, true)
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
    case 'weeklyRotation': {
      const { user } = content
      return getWeeklyRotationRoute(user, true)
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
    case 'contest': {
      const {
        track: { title },
        artist
      } = content
      return messages.contestShareText(title, getXShareHandle(artist))
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
    case 'weeklyRotation': {
      const { user } = content
      return messages.weeklyRotationShareText(getXShareHandle(user))
    }
    case 'milestone': {
      const {
        track: { title },
        artist,
        stat
      } = content
      const handle = getXShareHandle(artist)
      const { value, label } = getStatHeadline(stat)
      return stat.kind === 'trending' || stat.kind === 'underground'
        ? messages.milestoneRankShareText(
            title,
            stat.rank,
            label.toLowerCase(),
            handle
          )
        : messages.milestoneCountShareText(
            title,
            value,
            label.toLowerCase(),
            handle
          )
    }
  }
}

export const getXShareUrl = async (content: ShareContent) => {
  const url = getContentUrl(content)
  const shareText = await getXShareText(content)
  return makeXShareUrl(url ?? null, shareText)
}
