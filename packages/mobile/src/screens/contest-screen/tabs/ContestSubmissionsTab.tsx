import { useCallback, useEffect, useState } from 'react'

import { useRemixesLineup } from '@audius/common/api'
import { remixesPageLineupActions } from '@audius/common/store'

import { FilterButton, Flex, Text } from '@audius/harmony-native'
import { TanQueryLineup } from 'app/components/lineup/TanQueryLineup'

import { useContestPage } from '../ContestPageContext'

const CONTEST_PAGE_SIZE = 10

const messages = {
  submissions: 'SUBMISSIONS',
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
 * `RemixesPage` and the web contest page. A filter bar above the
 * lineup exposes Co-Signed + sort controls (recent/plays/favorites),
 * matching the web `RemixesPage` QA round.
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

  const submissionsCount = data?.length ?? 0

  // Header above the lineup — SUBMISSIONS label + filter row. Rendered
  // via `header` so it scrolls with the list (the collapsible tab
  // header already handles its own sticky behaviour; keeping this one
  // in-flow matches the web treatment).
  const renderHeader = () => (
    <Flex ph='l' pt='l' gap='m'>
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
  )

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
      header={renderHeader}
    />
  )
}
