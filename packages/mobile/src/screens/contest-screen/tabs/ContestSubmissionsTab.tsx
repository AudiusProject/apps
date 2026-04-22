import { useEffect } from 'react'

import { useRemixesLineup } from '@audius/common/api'
import { remixesPageLineupActions } from '@audius/common/store'

import { TanQueryLineup } from 'app/components/lineup/TanQueryLineup'

import { useContestPage } from '../ContestPageContext'

const CONTEST_PAGE_SIZE = 10

/**
 * Submissions body — remix lineup for the parent track's contest.
 * `TanQueryLineup` renders a `SectionList` from `app/components/core`
 * which auto-switches to `CollapsibleSectionList` when hosted in a
 * `CollapsibleTabNavigator`, so the surrounding header slides away
 * as the user scrolls through submissions.
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
  const lineup = useRemixesLineup({
    trackId,
    includeOriginal: false,
    includeWinners: true,
    isContestEntry: true,
    sortMethod: 'recent'
  })

  const { loadCachedDataIntoLineup, data } = lineup
  const hasData = (data?.length ?? 0) > 0

  useEffect(() => {
    if (hasData) {
      loadCachedDataIntoLineup()
    }
  }, [hasData, loadCachedDataIntoLineup])

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
    />
  )
}
