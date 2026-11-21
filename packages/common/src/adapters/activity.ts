import type {
  Activity,
  Playlist,
  PlaylistWithoutTracks,
  Track
} from '@audius/sdk'
import {
  ActivityItemTypeEnum,
  PlaylistWithoutTracksFromJSON,
  TrackFromJSON
} from '@audius/sdk'

import { userCollectionMetadataFromSDK } from './collection'
import { userTrackMetadataFromSDK } from './track'

function normalizeActivityItem(
  item: object,
  itemType:
    | typeof ActivityItemTypeEnum.Track
    | typeof ActivityItemTypeEnum.Playlist
): Track | PlaylistWithoutTracks {
  const isRaw = 'user_id' in item && !('userId' in item)
  if (!isRaw) {
    return item as Track | PlaylistWithoutTracks
  }
  if (itemType === ActivityItemTypeEnum.Track) {
    return TrackFromJSON(item as Parameters<typeof TrackFromJSON>[0])
  }
  return PlaylistWithoutTracksFromJSON(
    item as Parameters<typeof PlaylistWithoutTracksFromJSON>[0]
  )
}

export const trackActivityFromSDK = (input: Activity) => {
  const { timestamp, itemType: item_type, item } = input
  if (item_type === ActivityItemTypeEnum.Track) {
    const normalized = normalizeActivityItem(item as object, item_type)
    return {
      timestamp,
      item_type,
      item: userTrackMetadataFromSDK(normalized as Track)
    }
  }
  return undefined
}

export const repostActivityFromSDK = (input: Activity) => {
  const { timestamp, itemType: item_type, item } = input
  if (item_type === ActivityItemTypeEnum.Track) {
    try {
      const normalized = normalizeActivityItem(item as object, item_type)
      return {
        timestamp,
        item_type,
        item: userTrackMetadataFromSDK(normalized as Track)
      }
    } catch (error) {
      console.error('repostActivityFromSDK track error', error)
      return undefined
    }
  } else if (item_type === ActivityItemTypeEnum.Playlist) {
    try {
      const normalized = normalizeActivityItem(item as object, item_type)
      return {
        timestamp,
        item_type,
        item: userCollectionMetadataFromSDK(normalized as Playlist)
      }
    } catch (error) {
      console.error('repostActivityFromSDK playlist error', error)
      return undefined
    }
  }
  return undefined
}
