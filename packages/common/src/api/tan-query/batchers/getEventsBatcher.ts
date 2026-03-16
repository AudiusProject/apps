import { Id, OptionalId } from '@audius/sdk/services'
import { create, keyResolver, windowScheduler } from '@yornaath/batshit'
import { memoize } from 'lodash'

import { eventMetadataListFromSDK } from '~/adapters/event'
import { ID, Event } from '~/models'

import { contextCacheResolver } from './contextCacheResolver'
import { BatchContext } from './types'

export const getEventsBatcher = memoize(
  (context: BatchContext) =>
    create({
      fetcher: async (ids: ID[]): Promise<Event[]> => {
        const { sdk, currentUserId } = context
        if (!ids.length) return []
        const { data } = await sdk.events.getBulkEvents({
          id: ids.map((id) => Id.parse(id)),
          userId: OptionalId.parse(currentUserId)
        })

        return eventMetadataListFromSDK(data)
      },
      resolver: keyResolver('eventId'),
      scheduler: windowScheduler(10)
    }),
  contextCacheResolver()
)
