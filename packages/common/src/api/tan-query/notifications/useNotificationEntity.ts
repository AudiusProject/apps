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

  // For comment notifications on a remix-contest event the indexer sends
  // `entity_id = event_id` (not the underlying track). Resolve the event
  // first so we can chase its `entityId` (the parent track) below — that
  // way EntityLink can render the track title and `useGoToEntity` lands
  // on a navigable URL we can rewrite into the contest page.
  const { data: event } = useEvent(
    entityType === Entity.Event ? entityId : null
  )
  const trackIdFromEvent = event?.entityId ?? null

  // Always call hooks unconditionally. Track is resolved either directly
  // (Track entityType) or via the event hop (Event entityType).
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

  // Get user data for the entity. For Event-typed notifications the
  // "owner" is the contest host, not the underlying track's owner.
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
    if (track) {
      return { ...track, user: user ?? null }
    }
    if (collection) {
      return { ...collection, user: user ?? null }
    }
    return null
  }, [entityId, entityType, track, collection, user])
}
