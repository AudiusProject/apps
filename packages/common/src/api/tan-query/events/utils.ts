import { EventEntityTypeEnum, EventEventTypeEnum } from '@audius/sdk/services'
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
