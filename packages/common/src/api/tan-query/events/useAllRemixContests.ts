import {
  EventEntityTypeEnum,
  EventEventTypeEnum,
  GetRemixContestsStatusEnum,
  OptionalHashId,
  Event as SDKEvent
} from '@audius/sdk'
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'

import { userMetadataFromSDK } from '~/adapters'
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

export type RemixContestStatus = GetRemixContestsStatusEnum

type UseAllRemixContestsArgs = {
  pageSize?: number
  /**
   * Filter by contest status. Defaults to `'all'` (the backend's default),
   * which returns active contests first (ordered by soonest-ending end_date)
   * followed by ended contests (most-recently-ended first).
   */
  status?: RemixContestStatus
}

export const getAllRemixContestsQueryKey = ({
  pageSize = DEFAULT_PAGE_SIZE,
  status = GetRemixContestsStatusEnum.All
}: UseAllRemixContestsArgs = {}) =>
  [QUERY_KEYS.remixContestsList, { pageSize, status }] as unknown as QueryKey<
    ID[]
  >

/**
 * Hook to fetch all remix contest events with infinite query support.
 * Calls the dedicated discovery endpoint `GET /v1/events/remix-contests`
 * (SDK: `events.getRemixContests`), which returns events ordered with
 * currently-active contests first (by soonest-ending end_date) followed by
 * ended contests.
 *
 * Each page is mapped to the remix contest's parent track ID
 * (`event.entityId`) so consumers like `ContestCard` can receive a
 * `trackId` prop and resolve the event internally via `useRemixContest`.
 */
export const useAllRemixContests = (
  {
    pageSize = DEFAULT_PAGE_SIZE,
    status = GetRemixContestsStatusEnum.All
  }: UseAllRemixContestsArgs = {},
  options?: QueryOptions
) => {
  const { audiusSdk } = useQueryContext()
  const queryClient = useQueryClient()

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
        status
      })

      // Prime related tracks + users (full objects, delivered alongside the
      // event list on the discovery endpoint). This turns ContestCard's
      // useTrack / useUser into cache hits so the grid can paint with one
      // network round-trip instead of N+1.
      primeRelatedData({ related, queryClient })

      // Build a userId → is_deactivated lookup from the related users so
      // we can drop contests whose host has been tombstoned. The discovery
      // endpoint can still return these (e.g. the fake "Audius" /
      // life-audius-airdrop accounts) and rendering them on the explore
      // grid was the root of the "deleted accounts surface contests" bug.
      const deactivatedUserIds = new Set<ID>()
      for (const sdkUser of related?.users ?? []) {
        const u = userMetadataFromSDK(sdkUser)
        if (u?.is_deactivated) deactivatedUserIds.add(u.user_id)
      }

      // Prime useRemixes({ trackId, pageSize: 0, isContestEntry: true }) so
      // ContestCard's entry-count badge doesn't fire a count-only request
      // per card. The card reads `data.pages[0].count`, so we seed the
      // InfiniteData shape directly.
      const entryCounts = related?.entryCounts ?? {}
      for (const [hashedTrackId, count] of Object.entries(entryCounts)) {
        const trackId = OptionalHashId.parse(hashedTrackId)
        if (!trackId) continue
        // The useRemixes query key is typed as `InfiniteData<RemixesQueryData[]>`
        // (pages-of-arrays) but the runtime cache shape is `InfiniteData<RemixesQueryData>`
        // — see ContestCard's `remixesData?.pages?.[0]?.count` access. We
        // seed the real runtime shape and cast to bypass the existing key type.
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
          // Drop contests hosted by deactivated users (see comment above).
          if (event.userId && deactivatedUserIds.has(event.userId)) return null
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
          // Return the contest's parent track ID (event.entityId). The card
          // takes a trackId and resolves the event via useRemixContest.
          return event.entityId ?? null
        })
        .filter(removeNullable)
    },
    select: (data) => data.pages.flat(),
    ...options
  })
}
