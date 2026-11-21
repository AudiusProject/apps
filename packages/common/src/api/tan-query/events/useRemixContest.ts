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
  title?: string
  videoUrl?: string
  coverPhotoUrl?: string
  sourceTrackIds?: number[]
}

type RemixContestEvent = OverrideProperties<
  Event,
  {
    eventData: RemixContestData
  }
>

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

  const { data: remixContest } = useEvent<RemixContestEvent>(
    remixContestId,
    options
  )

  return {
    ...eventsQuery,
    data: remixContest
  }
}
