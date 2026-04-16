import { GetRemixContestsStatusEnum, Event as SDKEvent } from '@audius/sdk'
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'

import { eventMetadataFromSDK } from '~/adapters/event'
import { useQueryContext } from '~/api/tan-query/utils'
import { ID } from '~/models'
import { removeNullable } from '~/utils'

import { QUERY_KEYS } from '../queryKeys'
import { QueryKey, QueryOptions } from '../types'

import { getEventQueryKey } from './utils'

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
      const { data } = await sdk.events.getRemixContests({
        limit: pageSize,
        offset: pageParam,
        status
      })

      if (!data) return []

      return data
        .map((sdkEvent: SDKEvent) => {
          const event = eventMetadataFromSDK(sdkEvent)
          if (!event) return null
          // Prime the per-event cache so useEvent / useRemixContest hits
          // immediately downstream.
          queryClient.setQueryData(getEventQueryKey(event.eventId), event)
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
