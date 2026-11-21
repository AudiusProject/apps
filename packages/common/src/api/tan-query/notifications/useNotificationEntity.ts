import { useMemo } from 'react'

import type { Collection, Track, User } from '~/models'
import { Entity, Notification } from '~/store/notifications/types'

import { useCollection } from '../collection/useCollection'
import { useEvent } from '../events/useEvent'
import { useTrack } from '../tracks/useTrack'
import { useUser } from '../users/useUser'

type EntityWithUser = (Track | Collection) & {
  user: User | null
}

export const useNotificationEntity = <T extends Notification>(
  notification: T
): EntityWithUser | null => {
  const entityId = 'entityId' in notification ? notification.entityId : null
  const entityType =
    'entityType' in notification ? notification.entityType : null

  const { data: event } = useEvent(
    entityType === Entity.Event ? entityId : null
  )
  const trackIdFromEvent = event?.entityId ?? null

  const { data: track } = useTrack(
    entityType === Entity.Track
      ? entityId
      : entityType === Entity.Event
        ? trackIdFromEvent
        : null
  )
  const { data: collection } = useCollection(
    entityType === Entity.Playlist || entityType === Entity.Album
      ? entityId
      : null
  )

  const userId = useMemo(() => {
    if (!entityId || !entityType || entityType === Entity.User) return null
    if (entityType === Entity.Event) return event?.userId ?? null
    if (track) return track.owner_id
    if (collection) return collection.playlist_owner_id
    return null
  }, [entityId, entityType, event, track, collection])

  const { data: user } = useUser(userId)

  return useMemo(() => {
    if (!entityId || !entityType || entityType === Entity.User) return null
    if (track) {
      return { ...track, user: user ?? null }
    }
    if (collection) {
      return { ...collection, user: user ?? null }
    }
    return null
  }, [entityId, entityType, track, collection, user])
}
