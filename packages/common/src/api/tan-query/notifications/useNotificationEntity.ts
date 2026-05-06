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
  // Get entity ID and type if they exist
  const entityId = 'entityId' in notification ? notification.entityId : null
  const entityType =
    'entityType' in notification ? notification.entityType : null

  // Always call hooks unconditionally
  const { data: track } = useTrack(
    entityType === Entity.Track ? entityId : null
  )
  const { data: collection } = useCollection(
    entityType === Entity.Playlist || entityType === Entity.Album
      ? entityId
      : null
  )
  // For event-scoped notifications (e.g. comment likes on a contest), the
  // notification's entity_id is the event id; the underlying track surfaces
  // via events.entity_id. Resolve that hop so the entity link still
  // navigates to a real track and the comment count / metadata renders.
  const { data: event } = useEvent(
    entityType === Entity.Event ? entityId : null
  )
  const { data: eventTrack } = useTrack(event?.entityId ?? null)

  // Get user data for the entity
  const userId = useMemo(() => {
    if (!entityId || !entityType || entityType === Entity.User) return null
    if (entityType === Entity.Event) return event?.userId ?? null
    if (track) return track.owner_id
    if (collection) return collection.playlist_owner_id
    return null
  }, [entityId, entityType, event, track, collection])

  const { data: user } = useUser(userId)

  // Combine entity with user data
  return useMemo(() => {
    if (!entityId || !entityType || entityType === Entity.User) return null
    if (entityType === Entity.Event) {
      if (!eventTrack) return null
      return { ...eventTrack, user: user ?? null }
    }
    if (track) {
      return { ...track, user: user ?? null }
    }
    if (collection) {
      return { ...collection, user: user ?? null }
    }
    return null
  }, [entityId, entityType, eventTrack, track, collection, user])
}
