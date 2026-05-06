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
  // Events (contests) wrap an underlying track. Two-hop: event -> track.
  const { data: event } = useEvent(
    entityType === Entity.Event ? entityId : null
  )
  const eventTrackId = event?.entityId ?? null
  const { data: eventTrack } = useTrack(eventTrackId)

  // Get user data for the entity
  const userId = useMemo(() => {
    if (!entityId || !entityType || entityType === Entity.User) return null
    if (track) return track.owner_id
    if (collection) return collection.playlist_owner_id
    if (eventTrack) return eventTrack.owner_id
    return null
  }, [entityId, entityType, track, collection, eventTrack])

  const { data: user } = useUser(userId)

  // Combine entity with user data
  return useMemo(() => {
    if (!entityId || !entityType || entityType === Entity.User) return null
    if (track) {
      return { ...track, user: user ?? null }
    }
    if (collection) {
      return { ...collection, user: user ?? null }
    }
    if (eventTrack) {
      return { ...eventTrack, user: user ?? null }
    }
    return null
  }, [entityId, entityType, track, collection, eventTrack, user])
}
