import { useMemo } from 'react'

import type { Collection, Track, User } from '~/models'
import {
  Entity,
  Notification,
  NotificationType
} from '~/store/notifications/types'
import { removeNullable } from '~/utils'

import { useCollection } from '../collection/useCollection'
import { useTrack } from '../tracks/useTrack'
import { useTracks } from '../tracks/useTracks'
import { useCurrentUserId } from '../users/account/useCurrentUserId'
import { useUsers } from '../users/useUsers'

type EntityType = Track | Collection

type EntityWithUser<T extends EntityType> = T & {
  user: User
}

type EntityTypes<T extends Notification> = T extends {
  type:
    | NotificationType.AddTrackToPlaylist
    | NotificationType.TrackAddedToPurchasedAlbum
}
  ? {
      track: EntityWithUser<Track> | null
      playlist: EntityWithUser<Collection> | null
    }
  : T extends { entityIds: number[]; entityType: Entity }
    ? EntityWithUser<EntityType>[]
    : null

type PlaylistNotification = Extract<
  Notification,
  {
    type:
      | NotificationType.AddTrackToPlaylist
      | NotificationType.TrackAddedToPurchasedAlbum
  }
>

export const useNotificationEntities = <T extends Notification>(
  notification: T
): EntityTypes<T> => {
  // Always call hooks unconditionally
  const { data: track } = useTrack(
    'trackId' in notification ? notification.trackId : null
  )
  const { data: currentUserId } = useCurrentUserId()
  const { data: playlist } = useCollection(
    'playlistId' in notification ? notification.playlistId : null
  )

  // Get playlist owner for playlist notifications
  const isPlaylistNotification = (
    n: Notification
  ): n is PlaylistNotification & { playlistOwnerId: number } => {
    return (
      (n.type === NotificationType.AddTrackToPlaylist ||
        n.type === NotificationType.TrackAddedToPurchasedAlbum) &&
      'playlistOwnerId' in n &&
      typeof n.playlistOwnerId === 'number'
    )
  }

  const playlistOwnerId = isPlaylistNotification(notification)
    ? notification.playlistOwnerId
    : null

  const { data: users } = useUsers(playlistOwnerId ? [playlistOwnerId] : null)
  const playlistOwner = playlistOwnerId ? users?.[playlistOwnerId] : null

  // For entity-based notifications
  const entityIds = 'entityIds' in notification ? notification.entityIds : []
  // For UserSubscription notifications, limit to first entity to avoid
  // fetching extra tracks
  // The UI only uses entities[0] for single uploads and just shows the count
  // for multi-uploads.
  const isUserSubscription =
    notification.type === NotificationType.UserSubscription
  const trackEntityIds =
    isUserSubscription && entityIds.length > 1 ? [entityIds[0]] : entityIds
  const { data: tracks } = useTracks(
    'entityType' in notification && notification.entityType === Entity.Track
      ? trackEntityIds
      : null
  )

  // Get unique user IDs from tracks
  const userIds = useMemo(() => {
    return tracks?.map((track) => track?.owner_id).filter(removeNullable)
  }, [tracks])

  const { byId: trackUsers } = useUsers(userIds)

  // Combine tracks with their users
  const trackEntities = useMemo(() => {
    if (!tracks || !trackUsers) return []
    return tracks
      .map((track) => {
        if (!track) return null
        const user = trackUsers[track.owner_id]
        if (!user) {
          console.error(`Found empty user ${track.owner_id}`)
          return null
        }
        return {
          ...track,
          user
        }
      })
      .filter((entity): entity is EntityWithUser<Track> => entity !== null)
  }, [tracks, trackUsers])

  // Return appropriate data based on notification type
  if (
    notification.type === NotificationType.AddTrackToPlaylist ||
    notification.type === NotificationType.TrackAddedToPurchasedAlbum
  ) {
    const currentUser = currentUserId ? trackUsers?.[currentUserId] : null
    return {
      track: track && currentUser ? { ...track, user: currentUser } : null,
      playlist:
        playlist && playlistOwner ? { ...playlist, user: playlistOwner } : null
    } as EntityTypes<T>
  }

  if ('entityIds' in notification && 'entityType' in notification) {
    if (notification.entityType === Entity.Track) {
      return trackEntities as EntityTypes<T>
    }

    // For collections, we'll need to implement this once we have a collection query hook
    console.warn(
      'Collection notifications not yet implemented with query hooks'
    )
    return null as EntityTypes<T>
  }

  return null as EntityTypes<T>
}
