import { useCallback, useEffect, useMemo, useState } from 'react'

import { useRemixContest, useRemixesLineup } from '@audius/common/api'
import { remixesPageLineupActions } from '@audius/common/store'

import { Divider, FilterButton, Flex, Text } from '@audius/harmony-native'
import { TanQueryLineup } from 'app/components/lineup/TanQueryLineup'

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
  const { trackId } = useContestPage()
  const { data: contest } = useRemixContest(trackId)
  const winnerCount = contest?.eventData?.winners?.length ?? 0

  const [sortMethod, setSortMethod] = useState<'recent' | 'plays' | 'likes'>(
    'recent'
  )
  const [isCosign, setIsCosign] = useState(false)

  const handleSortChange = useCallback((value: string | undefined) => {
    setSortMethod((value as 'recent' | 'plays' | 'likes') ?? 'recent')
  }, [])

  const lineup = useRemixesLineup({
    trackId,
    includeOriginal: true,
    includeWinners: true,
    isContestEntry: true,
    sortMethod,
    isCosign
  })

  const { loadCachedDataIntoLineup, data } = lineup
  const hasData = (data?.length ?? 0) > 0

  useEffect(() => {
    if (hasData) {
      loadCachedDataIntoLineup()
    }
  }, [hasData, loadCachedDataIntoLineup])

  // Total lineup length includes original + winners + remixes. The
  // number of actual submissions (remixes) is the remainder once we
  // pull off the original (1 entry) and the winners.
  const submissionsCount = Math.max(
    0,
    (data?.length ?? 0) - 1 - winnerCount
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
  const delineatorMap =
    winnerCount > 0
      ? {
          0: winnersDelineator,
          [winnerCount]: submissionsDelineator
        }
      : {
          0: submissionsDelineator
        }

  return (
    <TanQueryLineup
      queryData={lineup.data}
      isFetching={lineup.isFetching}
      isPending={lineup.isPending}
      loadNextPage={lineup.loadNextPage}
      lineup={lineup.lineup}
      pageSize={CONTEST_PAGE_SIZE}
      hasMore={!!lineup.hasNextPage}
      actions={remixesPageLineupActions}
      delineatorMap={delineatorMap}
    />
  )
}
