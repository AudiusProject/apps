import type { Activity, Playlist, Track } from '@audius/sdk'
import { ActivityItemTypeEnum } from '@audius/sdk'

import { userCollectionMetadataFromSDK } from './collection'
import { userTrackMetadataFromSDK } from './track'

export const activityFromSDK = (input: Activity) => {
  const { timestamp, itemType: item_type, item } = input
  if (item_type === ActivityItemTypeEnum.Track) {
    return {
      timestamp,
      item_type,
      item: userTrackMetadataFromSDK(item as Track)
    }
  } else if (item_type === ActivityItemTypeEnum.Playlist) {
    return {
      timestamp,
      item_type,
      item: userCollectionMetadataFromSDK(item as Playlist)
    }
  }
  return undefined
}

export const trackActivityFromSDK = (input: Activity) => {
  const { timestamp, itemType: item_type, item } = input
  if (item_type === ActivityItemTypeEnum.Track) {
    return {
      timestamp,
      item_type,
      item: userTrackMetadataFromSDK(item as Track)
    }
  }
  return undefined
}

export const repostActivityFromSDK = (input: Activity) => {
  const { timestamp, itemType: item_type, item } = input
  if (item_type === ActivityItemTypeEnum.Track) {
    return {
      timestamp,
      item_type,
      item: userTrackMetadataFromSDK(item as Track)
    }
  } else if (item_type === ActivityItemTypeEnum.Playlist) {
    return {
      timestamp,
      item_type,
      item: userCollectionMetadataFromSDK(item as Playlist)
    }
  }
  return undefined
}
