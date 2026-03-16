import { Id, OptionalId } from '@audius/sdk/services'
import { create, windowScheduler } from '@yornaath/batshit'
import { memoize } from 'lodash'

import { eventMetadataListFromSDK } from '~/adapters/event'
import { ID, Event } from '~/models'

import { contextCacheResolver } from './contextCacheResolver'
import { BatchContext } from './types'

export const getEventsByEntityIdBatcher = memoize(
  (context: BatchContext) =>
    create({
      fetcher: async (entityIds: ID[]): Promise<Event[]> => {
        const { sdk, currentUserId } = context
        if (!entityIds.length) return []
        const { data } = await sdk.events.getEntityEvents({
          entityId: entityIds.map((entityId) => Id.parse(entityId)),
          userId: OptionalId.parse(currentUserId)
        })

        return eventMetadataListFromSDK(data)
      },
      resolver: (events: Event[], entityId: ID) =>
        events.filter((event) => event.entityId === entityId), // resolve array of events for entity ID
      scheduler: windowScheduler(10)
    }),
  contextCacheResolver()
)
