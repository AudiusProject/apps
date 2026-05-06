import { useEffect, useMemo } from 'react'

import {
  getEventIdsByEntityIdQueryKey,
  getEventQueryKey,
  useAllRemixContests,
  useProfileUser
} from '@audius/common/api'
import type { Event, ID } from '@audius/common/models'
import { EventEntityTypeEnum, EventEventTypeEnum } from '@audius/sdk'
import { useIsFocused } from '@react-navigation/native'
import { useQueryClient } from '@tanstack/react-query'
import { View } from 'react-native'

import { Box, Flex, LoadingSpinner } from '@audius/harmony-native'
import { ContestCard } from 'app/components/contest-card/ContestCard'
import { FlatList } from 'app/components/core'
import { spacing } from 'app/styles/spacing'

import { EmptyProfileTile } from '../EmptyProfileTile'

/**
 * Profile "Contests" tab on native. Lists the contests hosted by this
 * profile as a stacked list of `ContestCard`s that link out to the
 * dedicated contest screen (Figma 2864-13286 / 2888-22006).
 *
 * Uses the shared `FlatList` from `app/components/core` so the list
 * integrates with the parent `CollapsibleTabNavigator`'s scroll-tracking
 * — a regular `ScrollView` here breaks the collapsible header behaviour.
 *
 * Filtering by host:
 * The discovery `getRemixContests` endpoint doesn't yet support filtering
 * by host userId, so we paginate the global list and filter
 * client-side. We do the filter at the parent level by reading the
 * already-primed event from React Query's cache (useAllRemixContests
 * primes each event via `queryClient.setQueryData`). This avoids
 * per-row `useRemixContest` calls (which can race when multiple cards
 * mount at once) and gives a single deterministic list of trackIds to
 * render.
 *
 * Auto-paginates: we proactively fetch all pages until exhausted so the
 * tab is reliable for hosts whose contests sit beyond the first page of
 * the global list — `onEndReached` alone wouldn't fire for users with
 * just one or two visible cards (no scroll needed).
 */
export const ContestsTab = () => {
  const { user_id: hostUserId } =
    useProfileUser({
      select: (user) => ({ user_id: user.user_id })
    }).user ?? {}
  const isFocused = useIsFocused()
  const queryClient = useQueryClient()

  // Larger page size + auto-pagination below: the discovery endpoint
  // doesn't support `host=…`, so we paginate the global list and
  // filter client-side. Bumped from 50 → 100 because hosts whose
  // contests sit deep in the global list (ended contests, smaller
  // accounts) were missing from the tab — Julian's @dimensionx
  // report. Together with the `useEffect` below that drains pages
  // until exhausted, this guarantees the host's contests appear once
  // they're anywhere in the result set.
  const {
    data: trackIds,
    isPending,
    isFetching,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage
  } = useAllRemixContests({ pageSize: 100 }, { enabled: isFocused })

  const allTrackIds = useMemo(() => trackIds ?? [], [trackIds])

  // Filter to contests hosted by THIS profile by reading each contest's
  // event from the cache (primed by useAllRemixContests). Re-derives on
  // every render so newly-arrived pages flow in immediately.
  const contestTrackIds = useMemo(() => {
    if (hostUserId === undefined) return []
    return allTrackIds.filter((trackId) => {
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
  }, [allTrackIds, hostUserId, queryClient])

  // Auto-fetch subsequent pages until exhausted — see hook docstring.
  // The host's contests can sit anywhere in the global list, so a single
  // page isn't enough to guarantee we've seen them all.
  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage && isFocused) {
      fetchNextPage()
    }
  }, [hasNextPage, isFetchingNextPage, isFocused, fetchNextPage])

  if (!hostUserId) {
    return null
  }

  if (
    (isPending || isFetchingNextPage || hasNextPage) &&
    contestTrackIds.length === 0
  ) {
    return (
      <Flex justifyContent='center' style={{ marginTop: spacing(6) }}>
        <Box style={{ width: 24 }}>
          <LoadingSpinner />
        </Box>
      </Flex>
    )
  }

  if (!isFetching && contestTrackIds.length === 0) {
    return <EmptyProfileTile tab='contests' />
  }

  return (
    <FlatList
      data={contestTrackIds}
      keyExtractor={(trackId) => String(trackId)}
      renderItem={({ item: trackId }) => (
        <View
          style={{ paddingHorizontal: spacing(4), paddingBottom: spacing(4) }}
        >
          <ContestCard trackId={trackId} variant='grid' />
        </View>
      )}
      // Pad the top of the list so the first card has breathing room
      // below the sticky tab strip (otherwise the cover banner butts
      // straight up against the tab underline — the bug surfaced in
      // simulator verification).
      contentContainerStyle={{
        paddingTop: spacing(4),
        paddingBottom: spacing(6)
      }}
      showsVerticalScrollIndicator={false}
    />
  )
}
