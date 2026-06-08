import type { Track } from '@audius/common/models'
import { Entity, EntityType } from '@audius/common/store'
import { route } from '@audius/common/utils'

import { UserListEntityType } from 'store/application/ui/userListModal/types'
import { fullCollectionPage, fullTrackPage } from 'utils/route'
const { collectionPage } = route

export const getEntityLink = (
  entity: EntityType | Track,
  fullRoute = false
) => {
  if ('track_id' in entity) {
    return fullRoute ? fullTrackPage(entity.permalink) : entity.permalink
  } else if (entity.user && entity.playlist_id) {
    const getRoute = fullRoute ? fullCollectionPage : collectionPage
    return getRoute(
      entity.user.handle,
      entity.playlist_name,
      entity.playlist_id,
      entity.permalink,
      entity.is_album
    )
  }
  return ''
}

export const USER_LENGTH_LIMIT = 9

export const entityToUserListEntity = {
  [Entity.Track]: UserListEntityType.TRACK,
  [Entity.User]: UserListEntityType.USER,
  [Entity.Album]: UserListEntityType.COLLECTION,
  [Entity.Playlist]: UserListEntityType.COLLECTION,
  // Event-typed comment notifications resolve through the underlying
  // contest track (see useNotificationEntity), so the multi-user
  // overflow drawer treats them as track lists.
  [Entity.Event]: UserListEntityType.TRACK
}
