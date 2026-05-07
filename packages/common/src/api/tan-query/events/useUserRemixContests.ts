import {
  EventEntityTypeEnum,
  EventEventTypeEnum,
  GetContestsByUserStatusEnum,
  Id,
  OptionalHashId,
  Event as SDKEvent
} from '@audius/sdk'
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'

import { eventMetadataFromSDK } from '~/adapters/event'
import { getRemixesQueryKey } from '~/api/tan-query/remixes/useRemixes'
import { useQueryContext } from '~/api/tan-query/utils'
import { primeRelatedData } from '~/api/tan-query/utils/primeRelatedData'
import { ID } from '~/models'
import { removeNullable } from '~/utils'

import { QUERY_KEYS } from '../queryKeys'
import { QueryKey, QueryOptions } from '../types'

import { getEventIdsByEntityIdQueryKey, getEventQueryKey } from './utils'

const DEFAULT_PAGE_SIZE = 25

export type UserRemixContestStatus = GetContestsByUserStatusEnum

type UseUserRemixContestsArgs = {
  userId: ID | null | undefined
  pageSize?: number
  /**
   * Filter by contest status. Defaults to `'all'` (the backend's default),
   * which returns active contests first (ordered by soonest-ending end_date)
   * followed by ended contests (most-recently-ended first).
   */
  status?: UserRemixContestStatus
}

export const getUserRemixContestsQueryKey = ({
  userId,
  pageSize = DEFAULT_PAGE_SIZE,
  status = GetContestsByUserStatusEnum.All
}: UseUserRemixContestsArgs) =>
  [
    QUERY_KEYS.userRemixContests,
    { userId, pageSize, status }
  ] as unknown as QueryKey<ID[]>

/**
 * Hook to fetch remix contest events hosted by a specific user with infinite
 * query support. Calls the dedicated endpoint
 * `GET /v1/users/{id}/contests` (SDK: `users.getContestsByUser`), which returns
 * events ordered with currently-active contests first (by soonest-ending
 * end_date) followed by ended contests.
 *
 * Each page is mapped to the remix contest's parent track ID
 * (`event.entityId`) so consumers like `ContestCard` can receive a
 * `trackId` prop and resolve the event internally via `useRemixContest`.
 */
export const useUserRemixContests = (
  {
    userId,
    pageSize = DEFAULT_PAGE_SIZE,
    status = GetContestsByUserStatusEnum.All
  }: UseUserRemixContestsArgs,
  options?: QueryOptions
) => {
  const { audiusSdk } = useQueryContext()
  const queryClient = useQueryClient()

  return useInfiniteQuery({
    queryKey: getUserRemixContestsQueryKey({ userId, pageSize, status }),
    initialPageParam: 0,
    getNextPageParam: (lastPage: ID[], allPages) => {
      if (lastPage.length < pageSize) return undefined
      return allPages.length * pageSize
    },
    queryFn: async ({ pageParam }) => {
      const sdk = await audiusSdk()
      const { data, related } = await sdk.users.getContestsByUser({
        id: Id.parse(userId),
        limit: pageSize,
        offset: pageParam as number,
        status
      })

      // Prime related tracks + users (full objects, delivered alongside the
      // event list on the per-user endpoint, same shape as the discovery
      // endpoint).
      primeRelatedData({ related, queryClient })

      // Prime useRemixes({ trackId, pageSize: 0, isContestEntry: true }) so
      // ContestCard's entry-count badge doesn't fire a count-only request
      // per card.
      const entryCounts = related?.entryCounts ?? {}
      for (const [hashedTrackId, count] of Object.entries(entryCounts)) {
        const trackId = OptionalHashId.parse(hashedTrackId)
        if (!trackId) continue
        queryClient.setQueryData(
          getRemixesQueryKey({
            trackId,
            pageSize: 0,
            isContestEntry: true
          }),
          {
            pages: [{ count, tracks: [] }],
            pageParams: [0]
          } as unknown as never
        )
      }

      if (!data) return []

      return data
        .map((sdkEvent: SDKEvent) => {
          const event = eventMetadataFromSDK(sdkEvent)
          if (!event) return null
          // Prime the per-event cache so useEvent hits immediately downstream.
          queryClient.setQueryData(getEventQueryKey(event.eventId), event)
          // useRemixContest resolves via useEventIdsByEntityId keyed by
          // (entityId, entityType=Track, eventType=RemixContest). Prime that
          // lookup too so the card doesn't have to re-fetch the event list.
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
    enabled: !!userId && options?.enabled !== false,
    select: (data) => data.pages.flat(),
    ...options
  })
}
