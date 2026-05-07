import { useEffect, useMemo } from 'react'

import { EventEntityTypeEnum, EventEventTypeEnum } from '@audius/sdk'
import { useQueryClient } from '@tanstack/react-query'

import { ID } from '~/models'
import { Event } from '~/models/Event'

import { useAllRemixContests } from './useAllRemixContests'
import {
  getEventIdsByEntityIdQueryKey,
  getEventQueryKey
} from './utils'

const PAGE_SIZE = 50
const MAX_PAGES_TO_LOAD = 5

/**
 * Returns whether the given user hosts any remix contest. The discovery
 * endpoint behind `useAllRemixContests` doesn't yet support filtering by
 * host userId, so the global list is paginated client-side and matched
 * against `event.userId`. Mirrors the pagination cap used by the profile
 * Contests tab so a profile can decide whether to show the tab at all.
 *
 * The events returned by the SDK are primed into the React Query cache by
 * `useAllRemixContests`, so the per-track lookup here is a synchronous cache
 * read in practice.
 */
export const useUserHasRemixContest = (
  hostUserId: ID | null | undefined
) => {
  const queryClient = useQueryClient()

  const enabled = hostUserId != null
  const {
    data: trackIds,
    isPending,
    isFetching,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage
  } = useAllRemixContests({ pageSize: PAGE_SIZE }, { enabled })

  const loadedPages = trackIds ? Math.ceil(trackIds.length / PAGE_SIZE) : 0

  useEffect(() => {
    if (
      hostUserId != null &&
      hasNextPage &&
      !isFetchingNextPage &&
      loadedPages < MAX_PAGES_TO_LOAD
    ) {
      fetchNextPage()
    }
  }, [
    hostUserId,
    hasNextPage,
    isFetchingNextPage,
    loadedPages,
    fetchNextPage
  ])

  const hasContest = useMemo(() => {
    if (!hostUserId || !trackIds) return false
    return trackIds.some((trackId) => {
      const eventIds = queryClient.getQueryData<ID[]>(
        getEventIdsByEntityIdQueryKey({
          entityId: trackId,
          entityType: EventEntityTypeEnum.Track,
          eventType: EventEventTypeEnum.RemixContest
        })
      )
      const eventId = eventIds?.[0]
      if (!eventId) return false
      const event = queryClient.getQueryData<Event>(getEventQueryKey(eventId))
      return event?.userId === hostUserId
    })
  }, [hostUserId, trackIds, queryClient])

  // Match-not-yet-found is ambiguous while pages are still being fetched —
  // surface that so callers can hold off on hiding the tab and avoid a
  // late "tab appears" flash for hosts whose contests sit on later pages.
  const isResolving =
    isPending ||
    (!hasContest &&
      (isFetching ||
        (hasNextPage && loadedPages < MAX_PAGES_TO_LOAD)))

  return { hasContest, isPending: isResolving }
}
