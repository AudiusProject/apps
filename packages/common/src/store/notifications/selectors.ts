import { getAccountUser } from '~/store/account/selectors'
import {
  getCollection,
  getCollections
} from '~/store/cache/collections/selectors'
import { getTrack, getTracks } from '~/store/cache/tracks/selectors'
import { getUser, getUsers } from '~/store/cache/users/selectors'
import { CommonState } from '~/store/commonStore'
import { Nullable } from '~/utils'

import { Collection, ID, Track } from '../../models'

import {
  Entity,
  Notification,
  NotificationType,
  Achievement,
  EntityType,
  AddTrackToPlaylistNotification,
  CollectionEntity,
  TrackEntity,
  TrackAddedToPurchasedAlbumNotification
} from './types'

export const getNotificationUser = (
  state: CommonState,
  notification: Notification
) => {
  if (
    notification.type === NotificationType.TierChange ||
    (notification.type === NotificationType.Milestone &&
      notification.achievement === Achievement.Followers)
  ) {
    return getAccountUser(state)
  } else if ('userId' in notification) {
    return getUser(state, { id: notification.userId })
  } else if (
    'entityId' in notification &&
    'entityType' in notification &&
    notification.entityType === Entity.User
  ) {
    return getUser(state, { id: notification.entityId })
  } else {
    return null
  }
}

export const getNotificationUsers = (
  state: CommonState,
  notification: Notification,
  limit: number
) => {
  if ('userIds' in notification) {
    const userIds = notification.userIds.slice(0, limit)
    const userMap = getUsers(state, { ids: userIds })
    return userIds.map((id) => userMap[id].metadata)
  }
  return null
}

export const getNotificationEntity = (
  state: CommonState,
  notification: Notification
) => {
  if (
    'entityId' in notification &&
    'entityType' in notification &&
    notification.entityType !== Entity.User
  ) {
    const getEntity =
      notification.entityType === Entity.Track ? getTrack : getCollection
    const entity = getEntity(state, { id: notification.entityId })
    if (entity) {
      const userId =
        'owner_id' in entity ? entity.owner_id : entity.playlist_owner_id
      return {
        ...entity,
        user: getUser(state, { id: userId })
      }
    }
    return entity
  }
  return null
}

type EntityTypes<T extends Notification> = T extends
  | AddTrackToPlaylistNotification
  | TrackAddedToPurchasedAlbumNotification
  ? { track: TrackEntity; playlist: CollectionEntity }
  : Nullable<EntityType[]>

export const getNotificationEntities = <T extends Notification>(
  state: CommonState,
  notification: T
): EntityTypes<T> => {
  if (
    notification.type === NotificationType.AddTrackToPlaylist ||
    notification.type === NotificationType.TrackAddedToPurchasedAlbum
  ) {
    const track = getTrack(state, { id: notification.trackId })
    const currentUser = getAccountUser(state)
    const playlist = getCollection(state, { id: notification.playlistId })
    const playlistOwner = getUser(state, { id: notification.playlistOwnerId })
    return {
      track: { ...track, user: currentUser },
      playlist: { ...playlist, user: playlistOwner }
    } as EntityTypes<T>
  }

  if ('entityIds' in notification && 'entityType' in notification) {
    const getEntities =
      notification.entityType === Entity.Track ? getTracks : getCollections
    const entityMap = getEntities(state, { ids: notification.entityIds })
    const entities = notification.entityIds
      .map((entityId) => {
        const entity: Track | Collection = entityMap[entityId]?.metadata
        if (entity) {
          const userId =
            'owner_id' in entity ? entity.owner_id : entity.playlist_owner_id
          return {
            ...entity,
            user: getUser(state, { id: userId })
          }
        }
        return null
      })
      .filter((entity): entity is EntityType => !!entity)
    return entities as EntityTypes<T>
  }
  return null as EntityTypes<T>
}

export const getNotificationTrack = (state: CommonState, trackId: ID) => {
  const track = getTrack(state, { id: trackId })
  if (!track) return null
  const { owner_id } = track
  const owner = getUser(state, { id: owner_id })
  if (!owner) return null
  return { ...track, user: owner }
}
