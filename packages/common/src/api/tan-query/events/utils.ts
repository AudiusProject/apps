import { EventEntityTypeEnum, EventEventTypeEnum } from '@audius/sdk'
import { InfiniteData } from '@tanstack/react-query'

import { ID } from '~/models'
import { Event } from '~/models/Event'

import { QUERY_KEYS } from '../queryKeys'
import { QueryKey } from '../types'

export type EventIdsByEntityIdOptions = {
  entityId: ID | null | undefined
  entityType?: EventEntityTypeEnum
  eventType?: EventEventTypeEnum
  filterDeleted?: boolean
  offset?: number
  limit?: number
}

export const getEventQueryKey = (eventId: ID | null | undefined) => {
  return [QUERY_KEYS.events, eventId] as unknown as QueryKey<Event>
}

export const getEventListQueryKey = ({ pageSize }: { pageSize?: number }) => {
  return [QUERY_KEYS.events, { pageSize }] as unknown as QueryKey<
    InfiniteData<ID[]>
  >
}

export const getEventIdsByEntityIdQueryKey = (
  args?: EventIdsByEntityIdOptions
) => [QUERY_KEYS.eventsByEntityId, args] as unknown as QueryKey<ID[]>

export const dedupeContestTrackIds = (trackIds: ID[]) => {
  const seenTrackIds = new Set<ID>()
  return trackIds.filter((trackId) => {
    if (seenTrackIds.has(trackId)) return false
    seenTrackIds.add(trackId)
    return true
  })
}
