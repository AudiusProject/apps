import { EventEntityTypeEnum, EventEventTypeEnum } from '@audius/sdk'
import type { OverrideProperties } from 'type-fest'

import { Event } from '~/models/Event'
import { ID } from '~/models/Identifiers'

import { SelectableQueryOptions } from '../types'

import { useEvent } from './useEvent'
import { useEventIdsByEntityId } from './useEventsByEntityId'

export type RemixContestData = {
  description: string
  prizeInfo: string
  winners: ID[]
}

type RemixContestEvent = OverrideProperties<
  Event,
  {
    eventData: RemixContestData
  }
>

/**
 * Hook to fetch the remix contest event for a given entity ID.
 * Returns the first active RemixContest event found, or null if none exists.
 */
export const useRemixContest = (
  entityId: ID | null | undefined,
  options?: SelectableQueryOptions<Event, RemixContestEvent>
) => {
  const eventsQuery = useEventIdsByEntityId(
    {
      entityId,
      entityType: EventEntityTypeEnum.Track,
      eventType: EventEventTypeEnum.RemixContest
    },
    { enabled: options?.enabled !== false }
  )

  const remixContestId = eventsQuery.data?.[0]

  const eventQuery = useEvent<RemixContestEvent>(remixContestId, options)

  const isPending =
    eventsQuery.isPending || (remixContestId != null && eventQuery.isPending)

  const isFetching =
    eventsQuery.isFetching || (remixContestId != null && eventQuery.isFetching)

  return {
    ...eventsQuery,
    data: eventQuery.data,
    isPending,
    isFetching,
    isLoading: isPending
  }
}
