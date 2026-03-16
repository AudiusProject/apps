import { OptionalId, Event as SDKEvent } from '@audius/sdk/services'
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'

import { eventMetadataFromSDK } from '~/adapters/event'
import { useQueryContext } from '~/api/tan-query/utils'
import { ID } from '~/models'
import { removeNullable } from '~/utils'

import { QueryOptions } from '../types'
import { useCurrentUserId } from '../users/account/useCurrentUserId'

import { getEventQueryKey, getEventListQueryKey } from './utils'

const DEFAULT_PAGE_SIZE = 25

type UseAllEventsArgs = {
  pageSize?: number
}

/**
 * Hook to fetch all events with infinite query support.
 * This version supports infinite scrolling and maintains the full list of events.
 */
export const useAllEvents = (
  { pageSize = DEFAULT_PAGE_SIZE }: UseAllEventsArgs = {},
  options?: QueryOptions
) => {
  const { audiusSdk } = useQueryContext()
  const { data: currentUserId } = useCurrentUserId()
  const queryClient = useQueryClient()

  const queryRes = useInfiniteQuery({
    queryKey: getEventListQueryKey({ pageSize }),
    initialPageParam: 0,
    getNextPageParam: (lastPage: ID[], allPages) => {
      if (lastPage.length < pageSize) return undefined
      return allPages.length * pageSize
    },
    queryFn: async ({ pageParam }) => {
      const sdk = await audiusSdk()
      const { data } = await sdk.events.getAllEvents({
        limit: pageSize,
        offset: pageParam,
        userId: OptionalId.parse(currentUserId)
      })

      if (!data) return []

      const eventIds = data
        .map((sdkEvent: SDKEvent) => {
          const event = eventMetadataFromSDK(sdkEvent)
          if (!event) return null
          // Prime the event cache with individual events
          queryClient.setQueryData(getEventQueryKey(event.eventId), event)
          return event.eventId
        })
        .filter(removeNullable)

      return eventIds
    },
    select: (data) => data.pages.flat(),
    ...options
  })

  return queryRes
}
