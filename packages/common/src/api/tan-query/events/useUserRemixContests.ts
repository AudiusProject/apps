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

export type UserRemixContestStatus = GetContestsByUserStatusEnum

type UseUserRemixContestsArgs = {
  userId: ID | null | undefined
  pageSize?: number
  /**
   * Filter by contest status. Defaults to `'all'`, which returns active
   * contests first (ordered by soonest-ending end_date) followed by ended
   * contests (most-recently-ended first).
   */
  status?: UserRemixContestStatus
}

export const getUserRemixContestsQueryKey = ({
  userId,
  pageSize = DEFAULT_PAGE_SIZE,
  status = GetContestsByUserStatusEnum.All
}: UseUserRemixContestsArgs) =>
  [
    QUERY_KEYS.userRemixContestsList,
    userId,
    { pageSize, status }
  ] as unknown as QueryKey<ID[]>

/**
 * Hook to fetch the remix contests hosted by a specific user with infinite
 * query support. Calls `GET /v1/users/{id}/contests` (SDK:
 * `users.getContestsByUser`), which returns events ordered with
 * currently-active contests first (by soonest-ending end_date) followed by
 * ended contests.
 *
 * Each page is mapped to the contest's parent track ID (`event.entityId`)
 * so consumers like `ContestCard` can take a `trackId` prop and resolve the
 * event internally via `useRemixContest`.
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
  const { data: currentUserId } = useCurrentUserId()

  return useInfiniteQuery({
    queryKey: getUserRemixContestsQueryKey({ userId, pageSize, status }),
    initialPageParam: 0,
    getNextPageParam: (lastPage: ID[], allPages) => {
      if (lastPage.length < pageSize) return undefined
      return allPages.length * pageSize
    },
    queryFn: async ({ pageParam }) => {
      if (!userId) return []
      const sdk = await audiusSdk()
      const { data, related } = await sdk.users.getContestsByUser({
        id: Id.parse(userId),
        limit: pageSize,
        offset: pageParam,
        status,
        // Requester id so the backend personalizes embedded related.users
        // (e.g. does_current_user_follow). Path `id` is the contest host;
        // query `userId` is the current user viewing the page.
        userId: currentUserId ? Id.parse(currentUserId) : undefined
      })

      // Prime related tracks + users (full objects, delivered alongside the
      // event list). This turns ContestCard's useTrack / useUser into cache
      // hits so the grid can paint with one network round-trip instead of
      // N+1.
      primeRelatedData({ related, queryClient })

      // Prime the dedicated `useRemixesCount` cache so ContestCard's
      // entry-count badge doesn't fire a count-only request per card.
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
          // Prime per-event cache so useEvent hits immediately downstream.
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
    select: (data) => data.pages.flat(),
    enabled: options?.enabled !== false && !!userId,
    ...options
  })
}
