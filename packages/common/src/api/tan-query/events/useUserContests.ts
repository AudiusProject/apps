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

export type UserContestStatus = GetContestsByUserStatusEnum

type UseUserContestsArgs = {
  userId: ID | null | undefined
  pageSize?: number
  /**
   * Filter by contest status. Defaults to `'all'` (the backend's default),
   * which returns active contests first (ordered by soonest-ending end_date)
   * followed by ended contests (most-recently-ended first).
   */
  status?: UserContestStatus
}

export const getUserContestsQueryKey = ({
  userId,
  pageSize = DEFAULT_PAGE_SIZE,
  status = GetContestsByUserStatusEnum.All
}: UseUserContestsArgs) =>
  [
    QUERY_KEYS.userContests,
    { userId, pageSize, status }
  ] as unknown as QueryKey<ID[]>

/**
 * Fetch the remix contests hosted by a specific user. Calls the dedicated
 * discovery endpoint `GET /v1/users/{id}/contests` (SDK:
 * `users.getContestsByUser`), which returns events ordered with
 * currently-active contests first (by soonest-ending end_date) followed by
 * ended contests.
 *
 * Each page is mapped to the contest's parent track ID (`event.entityId`) so
 * consumers like `ContestCard` can take a `trackId` prop and resolve the event
 * via `useRemixContest`.
 */
export const useUserContests = (
  {
    userId,
    pageSize = DEFAULT_PAGE_SIZE,
    status = GetContestsByUserStatusEnum.All
  }: UseUserContestsArgs,
  options?: QueryOptions
) => {
  const { audiusSdk } = useQueryContext()
  const queryClient = useQueryClient()

  return useInfiniteQuery({
    queryKey: getUserContestsQueryKey({ userId, pageSize, status }),
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
        offset: pageParam,
        status
      })

      // Prime related tracks + users so ContestCard's useTrack / useUser are
      // cache hits — same pattern as useAllRemixContests.
      primeRelatedData({ related, queryClient })

      // Prime useRemixes({ trackId, pageSize: 0, isContestEntry: true }) so
      // ContestCard's entry-count badge doesn't fire a count-only request per
      // card.
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
    ...options,
    enabled: !!userId && options?.enabled !== false
  })
}
