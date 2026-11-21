import {
  EventEntityTypeEnum,
  EventEventTypeEnum,
  GetRemixContestsStatusEnum,
  Id,
  OptionalHashId,
  Event as SDKEvent
} from '@audius/sdk'
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'

import { eventMetadataFromSDK } from '~/adapters/event'
import { getRemixesCountQueryKey } from '~/api/tan-query/remixes/useRemixes'
import { useQueryContext } from '~/api/tan-query/utils'
import { primeRelatedData } from '~/api/tan-query/utils/primeRelatedData'
import { ID } from '~/models'
import { removeNullable } from '~/utils'

import { QUERY_KEYS } from '../queryKeys'
import { QueryKey, QueryOptions } from '../types'
import { useCurrentUserId } from '../users/account/useCurrentUserId'

import { getEventIdsByEntityIdQueryKey, getEventQueryKey } from './utils'

const DEFAULT_PAGE_SIZE = 25

export type RemixContestStatus = GetRemixContestsStatusEnum

type UseAllRemixContestsArgs = {
  pageSize?: number
  status?: RemixContestStatus
}

export const getAllRemixContestsQueryKey = ({
  pageSize = DEFAULT_PAGE_SIZE,
  status = GetRemixContestsStatusEnum.All
}: UseAllRemixContestsArgs = {}) =>
  [QUERY_KEYS.remixContestsList, { pageSize, status }] as unknown as QueryKey<
    ID[]
  >

export const useAllRemixContests = (
  {
    pageSize = DEFAULT_PAGE_SIZE,
    status = GetRemixContestsStatusEnum.All
  }: UseAllRemixContestsArgs = {},
  options?: QueryOptions
) => {
  const { audiusSdk } = useQueryContext()
  const queryClient = useQueryClient()
  const { data: currentUserId } = useCurrentUserId()

  return useInfiniteQuery({
    queryKey: getAllRemixContestsQueryKey({ pageSize, status }),
    initialPageParam: 0,
    getNextPageParam: (lastPage: ID[], allPages) => {
      if (lastPage.length < pageSize) return undefined
      return allPages.length * pageSize
    },
    queryFn: async ({ pageParam }) => {
      const sdk = await audiusSdk()
      const { data, related } = await sdk.events.getRemixContests({
        limit: pageSize,
        offset: pageParam,
        status,
        userId: currentUserId ? Id.parse(currentUserId) : undefined
      })

      primeRelatedData({ related, queryClient })

      const entryCounts = related?.entryCounts ?? {}
      for (const [hashedTrackId, count] of Object.entries(entryCounts)) {
        const trackId = OptionalHashId.parse(hashedTrackId)
        if (!trackId) continue
        queryClient.setQueryData(
          getRemixesCountQueryKey({ trackId, isContestEntry: true }),
          count
        )
      }

      if (!data) return []

      return data
        .map((sdkEvent: SDKEvent) => {
          const event = eventMetadataFromSDK(sdkEvent)
          if (!event) return null
          queryClient.setQueryData(getEventQueryKey(event.eventId), event)
          if (
            event.entityId &&
            event.entityType === EventEntityTypeEnum.Track
          ) {
            queryClient.setQueryData(
              getEventIdsByEntityIdQueryKey({
                entityId: event.entityId,
                entityType: EventEntityTypeEnum.Track,
                eventType: EventEventTypeEnum.RemixContest
              }),
              [event.eventId]
            )
          }
          return event.entityId ?? null
        })
        .filter(removeNullable)
    },
    select: (data) => data.pages.flat(),
    ...options
  })
}
