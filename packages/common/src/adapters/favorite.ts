import { OptionalHashId, type Favorite as SdkFavorite } from '@audius/sdk/services'
import { omit } from 'lodash'
import snakecaseKeys from 'snakecase-keys'

import { Favorite, FavoriteType } from '~/models/Favorite'

export const favoriteFromSDK = (input: SdkFavorite): Favorite | undefined => {
  const decodedSaveItemId =
    typeof input.favoriteItemId === 'string'
      ? OptionalHashId.parse(input.favoriteItemId)
      : input.favoriteItemId
  const decodedUserId =
    typeof input.userId === 'string'
      ? OptionalHashId.parse(input.userId)
      : input.userId
  if (!decodedSaveItemId || !decodedUserId) {
    return undefined
  }

  return {
    // 'save' is renamed to 'favorite' in the model
    ...omit(snakecaseKeys(input), ['favorite_item_id', 'favorite_type']),
    save_item_id: decodedSaveItemId,
    save_type: input.favoriteType as FavoriteType,
    user_id: decodedUserId,
    created_at: input.createdAt
  }
}
