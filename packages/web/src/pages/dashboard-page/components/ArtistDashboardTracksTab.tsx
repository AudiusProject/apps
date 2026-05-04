import { useCallback, useState } from 'react'

import {
  useCurrentAccountUser,
  useUserTracksByHandle
} from '@audius/common/api'
import { Nullable } from '@audius/common/utils'
import { Flex } from '@audius/harmony'

import { RESPONSIVE_TABLE_POLICIES } from 'components/table/responsivePolicies'
import { TracksTable, TracksTableColumn } from 'components/tracks-table'
import { useNavigateToPage } from 'hooks/useNavigateToPage'

import styles from '../DashboardPage.module.css'

import { EmptySearchResults } from './EmptySearchResults'
import { EmptyTabState } from './EmptyTabState'
import { SHOW_MORE_LIMIT, TABLE_PAGE_SIZE } from './constants'
import { useFilteredTrackData } from './hooks'
import { TrackFilters } from './types'

const tracksTableColumns: TracksTableColumn[] = [
  'spacer',
  'trackName',
  'releaseDate',
  'plays',
  'comments',
  'saves',
  'reposts',
  'overflowMenu'
]

type ArtistDashboardTracksTabProps = {
  selectedFilter: Nullable<TrackFilters>
  filterText: string
}

export const ArtistDashboardTracksTab = ({
  selectedFilter,
  filterText
}: ArtistDashboardTracksTabProps) => {
  const navigate = useNavigateToPage()
  const [page, setPage] = useState(0)

  const { data: accountUser } = useCurrentAccountUser()
  const account = accountUser
  // Drives table loading state for the current page. Replaces the legacy
  // `getDashboardTracksStatus` selector — `useFormattedTrackData` (used by
  // useFilteredTrackData below) reads page 0; this query reads the current
  // page so the table's loading indicator reflects pagination fetches.
  const { isPending: tracksPending } = useUserTracksByHandle(
    {
      handle: accountUser?.handle,
      filterTracks: 'all',
      limit: TABLE_PAGE_SIZE,
      offset: page * TABLE_PAGE_SIZE
    },
    { enabled: !!accountUser?.handle }
  )

  const filteredData = useFilteredTrackData({
    selectedFilter,
    filterText
  })

  const handleFetchPage = useCallback((nextPage: number) => {
    setPage(nextPage)
  }, [])

  const onClickRow = useCallback(
    (track: any) => {
      if (!account) return
      navigate(track.permalink)
    },
    [account, navigate]
  )

  return !filteredData.length || !account ? (
    filterText ? (
      <EmptySearchResults />
    ) : (
      <EmptyTabState type='track' />
    )
  ) : (
    <Flex w='100%' direction='column' borderTop='default'>
      <TracksTable
        data={filteredData}
        disabledTrackEdit
        columns={tracksTableColumns}
        onClickRow={onClickRow}
        fetchPage={handleFetchPage}
        pageSize={TABLE_PAGE_SIZE}
        userId={account.user_id}
        showMoreLimit={SHOW_MORE_LIMIT}
        totalRowCount={account.track_count}
        loading={tracksPending}
        isPaginated
        tableHeaderClassName={styles.tableHeader}
        responsiveColumns={RESPONSIVE_TABLE_POLICIES.dashboardTracks}
        shouldShowGatedType
      />
    </Flex>
  )
}
