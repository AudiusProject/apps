import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import {
  getRemixesQueryKey,
  useRemixContest,
  useRemixesCount,
  useRemixesLineup
} from '@audius/common/api'
import { Name } from '@audius/common/models'
import type { ID } from '@audius/common/models'
import { useFocusedTab } from 'react-native-collapsible-tab-view'

import { Divider, FilterButton, Flex, Text } from '@audius/harmony-native'
import { TrackLineup } from 'app/components/lineup/TrackLineup'
import { make, track as trackEvent } from 'app/services/analytics'

import { useContestPage } from '../ContestPageContext'

const CONTEST_PAGE_SIZE = 10

const messages = {
  submissions: 'SUBMISSIONS',
  winners: 'WINNERS',
  coSigned: 'Co-Signed',
  sort: 'Sort'
}

const SORT_OPTIONS = [
  { label: 'Most Recent', value: 'recent' as const },
  { label: 'Most Plays', value: 'plays' as const },
  { label: 'Most Favorites', value: 'likes' as const }
]

/**
 * Submissions body — remix lineup for the parent track's contest.
 * `TanQueryLineup` renders a `SectionList` from `app/components/core`
 * which auto-switches to `CollapsibleSectionList` when hosted in a
 * `CollapsibleTabNavigator`, so the surrounding header slides away
 * as the user scrolls through submissions.
 *
 * The lineup now includes the original (parent) track at the top
 * (`includeOriginal: true`) so listeners can compare against the
 * source without jumping back out — same behaviour as the track-page
 * `RemixesPage` and the web contest page. A filter bar lives inside
 * the submissions delineator (rendered between winners and remixes)
 * with Co-Signed + sort controls (recent/plays/favorites). This
 * mirrors the legacy `TrackRemixesScreen` delineator pattern so the
 * lineup reads as: original → WINNERS label → winner tracks →
 * SUBMISSIONS (N) label + filter bar → remix entries.
 *
 * We manually call `loadCachedDataIntoLineup()` once the tan-query
 * page has data. `useRemixesLineup` opts out of automatic cache
 * handling (`disableAutomaticCacheHandling: true`), which means the
 * Redux lineup entries would otherwise lag behind tan-query for a
 * tick — during that gap `TanQueryLineup`'s skeletons stop
 * rendering but `lineup.entries` is still empty, so the whole list
 * momentarily goes blank before the real tiles arrive. Calling
 * `loadCachedDataIntoLineup` after the data resolves bridges that
 * gap by hydrating Redux from the tan-query cache immediately.
 */
export const ContestSubmissionsTab = () => {
  const { trackId, eventId } = useContestPage()
  const { data: contest } = useRemixContest(trackId)
  const winnerCount = contest?.eventData?.winners?.length ?? 0

  // Fire a Remix Contest: View Submissions event the first time the
  // user actually focuses this tab. Tabs are mounted eagerly
  // (`lazy: false` in `CollapsibleTabNavigator`), so a plain mount
  // effect would fire even for users who only ever look at the Details
  // tab. `useFocusedTab` from react-native-collapsible-tab-view is the
  // primitive the tab navigator already uses — it returns the
  // currently-focused tab name and re-runs effects when that changes.
  const focusedTab = useFocusedTab()
  const hasFiredSubmissionsViewRef = useRef(false)
  useEffect(() => {
    if (hasFiredSubmissionsViewRef.current) return
    if (focusedTab !== 'Submissions') return
    if (trackId == null || eventId == null) return
    hasFiredSubmissionsViewRef.current = true
    trackEvent(
      make({
        eventName: Name.REMIX_CONTEST_VIEW_SUBMISSIONS,
        remixContestId: eventId,
        trackId
      })
    )
  }, [focusedTab, trackId, eventId])

  const [sortMethod, setSortMethod] = useState<'recent' | 'plays' | 'likes'>(
    'recent'
  )
  const [isCosign, setIsCosign] = useState(false)

  const handleSortChange = useCallback((value: string | undefined) => {
    setSortMethod((value as 'recent' | 'plays' | 'likes') ?? 'recent')
  }, [])

  const remixesLineupArgs = useMemo(
    () => ({
      trackId,
      includeOriginal: true,
      includeWinners: true,
      isContestEntry: true,
      pageSize: CONTEST_PAGE_SIZE,
      sortMethod,
      isCosign
    }),
    [trackId, sortMethod, isCosign]
  )
  const lineup = useRemixesLineup(remixesLineupArgs)
  const lineupTrackIds = useMemo(
    () => (lineup.data ?? []).map((d) => d.id as ID),
    [lineup.data]
  )

  const submissionsQuerySource = useMemo(
    () => ({
      queryKey: [...getRemixesQueryKey(remixesLineupArgs)] as unknown[]
    }),
    [remixesLineupArgs]
  )

  // Submissions total comes from a count-only API query so it matches
  // the contest card total instead of growing as the user scrolls.
  const { data: submissionsCount = 0 } = useRemixesCount(
    { trackId, isContestEntry: true },
    { enabled: !!trackId, staleTime: 60_000 }
  )

  const winnersDelineator = useMemo(
    () => (
      <Flex ph='l' pt='l' gap='xs'>
        <Divider />
        <Text variant='label' size='m' color='subdued'>
          {messages.winners}
        </Text>
      </Flex>
    ),
    []
  )

  const submissionsDelineator = useMemo(
    () => (
      <Flex ph='l' pt='l' gap='m'>
        <Divider />
        <Flex row justifyContent='space-between' alignItems='center' gap='s'>
          <Text variant='label' size='m' color='subdued'>
            {submissionsCount > 0
              ? `${submissionsCount} ${messages.submissions}`
              : messages.submissions}
          </Text>
        </Flex>
        <Flex row gap='s' wrap='wrap'>
          <FilterButton
            label={messages.coSigned}
            value={isCosign ? 'true' : undefined}
            onPress={() => setIsCosign((prev) => !prev)}
            onChange={(v) => setIsCosign(v === 'true')}
            size='small'
          />
          <FilterButton
            label={messages.sort}
            value={sortMethod}
            variant='replaceLabel'
            onChange={handleSortChange}
            options={SORT_OPTIONS}
            disableSearch
            size='small'
          />
        </Flex>
      </Flex>
    ),
    [submissionsCount, isCosign, sortMethod, handleSortChange]
  )

  // Lineup shape is [original, ...winners, ...remixes]. Delineator
  // keys map to the index the label renders AFTER, so:
  // - With winners: WINNERS after original (index 0), SUBMISSIONS
  //   after the last winner (index `winnerCount`).
  // - Without winners: SUBMISSIONS after original (index 0).
  // Same pattern the legacy `TrackRemixesScreen` uses.
  // Memoized so the reference stays stable across renders — the map
  // feeds `TanQueryLineup`'s `renderItem` deps, and a fresh object
  // each render would force the whole list to re-render.
  const delineatorMap = useMemo(
    () =>
      winnerCount > 0
        ? {
            0: winnersDelineator,
            [winnerCount]: submissionsDelineator
          }
        : {
            0: submissionsDelineator
          },
    [winnerCount, winnersDelineator, submissionsDelineator]
  )

  return (
    <TrackLineup
      trackIds={lineupTrackIds}
      source='CONTEST_SUBMISSIONS'
      querySource={submissionsQuerySource}
      isPending={lineup.isPending}
      isFetching={lineup.isFetching}
      loadNextPage={lineup.loadNextPage}
      pageSize={CONTEST_PAGE_SIZE}
      hasNextPage={!!lineup.hasNextPage}
      delineatorMap={delineatorMap}
    />
  )
}
