import { full } from '@audius/sdk'

import { UserCollectionMetadata, UserTrackMetadata } from '~/models'

import { userCollectionMetadataFromSDK } from './collection'
import { userTrackMetadataFromSDK } from './track'

type UserFeedItem = {
  type: 'track' | 'playlist'
  item: UserTrackMetadata | UserCollectionMetadata
}

export const userFeedItemFromSDK = (
  input: full.UserFeedItem
): UserFeedItem | undefined => {
  const item =
    input.type === 'track'
      ? userTrackMetadataFromSDK(input.item)
      : userCollectionMetadataFromSDK(input.item)
  return item ? { type: input.type, item } : undefined
}
