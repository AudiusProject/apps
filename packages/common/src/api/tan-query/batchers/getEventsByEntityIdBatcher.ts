import { Id, OptionalHashId, OptionalId } from '@audius/sdk'
import { create, windowScheduler } from '@yornaath/batshit'
import { memoize } from 'lodash'

import { eventMetadataListFromSDK } from '~/adapters/event'
import { ID, Event } from '~/models'

import { getRemixesCountQueryKey } from '../remixes/useRemixes'

import { contextCacheResolver } from './contextCacheResolver'
import { BatchContext } from './types'

export const getEventsByEntityIdBatcher = memoize(
  (context: BatchContext) =>
    create({
      fetcher: async (entityIds: ID[]): Promise<Event[]> => {
        const { sdk, currentUserId, queryClient } = context
        if (!entityIds.length) return []
        const { data, related } = await sdk.events.getEntityEvents({
          entityId: entityIds.map((entityId) => Id.parse(entityId)),
          userId: OptionalId.parse(currentUserId)
        })

        const entryCounts = related?.entryCounts ?? {}
        for (const [hashedTrackId, count] of Object.entries(entryCounts)) {
          const trackId = OptionalHashId.parse(hashedTrackId)
          if (!trackId) continue
          queryClient.setQueryData(
            getRemixesCountQueryKey({ trackId, isContestEntry: true }),
            count
          )
        }

        return eventMetadataListFromSDK(data)
      },
      resolver: (events: Event[], entityId: ID) =>
        events.filter((event) => event.entityId === entityId), // resolve array of events for entity ID
      scheduler: windowScheduler(10)
    }),
  contextCacheResolver()
)
