import { useCallback, useMemo, useState } from 'react'

import {
  useCurrentAccountUser,
  useUserTracksByHandle
} from '@audius/common/api'
import { useFeatureFlag } from '@audius/common/hooks'
import { FeatureFlags } from '@audius/common/services'
import { Nullable } from '@audius/common/utils'
import { Checkbox, Flex } from '@audius/harmony'

import {
  TrackSelectionProvider,
  useTrackSelection
} from 'components/collection/desktop/edit-mode/tracks/TrackSelectionContext'
import { RESPONSIVE_TABLE_POLICIES } from 'components/table/responsivePolicies'
import { TracksTable, TracksTableColumn } from 'components/tracks-table'
import { useNavigateToPage } from 'hooks/useNavigateToPage'

import styles from '../DashboardPage.module.css'

import { EmptySearchResults } from './EmptySearchResults'
import { EmptyTabState } from './EmptyTabState'
import selectionStyles from './bulk-edit/BulkEditTracks.module.css'
import { BulkEditTracksBar } from './bulk-edit/BulkEditTracksBar'
import { SHOW_MORE_LIMIT, TABLE_PAGE_SIZE } from './constants'
import { useFilteredTrackData } from './hooks'
import { DataSourceTrack, TrackFilters } from './types'

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

export const ArtistDashboardTracksTab = (
  props: ArtistDashboardTracksTabProps
) => {
  const filteredData = useFilteredTrackData(props)
  const orderedIds = useMemo(
    () => filteredData.map((track) => track.track_id),
    [filteredData]
  )
  return (
    <TrackSelectionProvider orderedIds={orderedIds}>
      <TracksTab {...props} filteredData={filteredData} />
    </TrackSelectionProvider>
  )
}

const TracksTab = ({
  filterText,
  filteredData
}: ArtistDashboardTracksTabProps & { filteredData: DataSourceTrack[] }) => {
  const { isEnabled: isTrackRowsEnabled } = useFeatureFlag(
    FeatureFlags.TRACK_ROWS
  )
  const { isEnabled: isBulkEditEnabled } = useFeatureFlag(
    FeatureFlags.BULK_TRACK_EDIT
  )
  const selection = useTrackSelection()
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

  const renderTrackPrefix = useCallback(
    (track: DataSourceTrack, index: number) => {
      const checked = selection.isSelected(track.track_id)
      return (
        <Checkbox
          aria-label={`${checked ? 'Deselect' : 'Select'} ${track.title}`}
          checked={checked}
          onClick={(e) => {
            // Keep the click from opening the track page.
            e.stopPropagation()
            selection.toggle(track.track_id, index, { shift: e.shiftKey })
          }}
          onChange={() => {}}
        />
      )
    },
    [selection]
  )

  const rowClassNameAddition = useCallback(
    (track: DataSourceTrack) =>
      selection.isSelected(track.track_id)
        ? selectionStyles.selected
        : undefined,
    [selection]
  )

  return !filteredData.length || !account ? (
    filterText ? (
      <EmptySearchResults />
    ) : (
      <EmptyTabState type='track' />
    )
  ) : (
    <Flex
      w='100%'
      direction='column'
      borderTop={isBulkEditEnabled ? undefined : 'default'}
    >
      {isBulkEditEnabled ? <BulkEditTracksBar tracks={filteredData} /> : null}
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
        isDense={isTrackRowsEnabled}
        renderTrackPrefix={isBulkEditEnabled ? renderTrackPrefix : undefined}
        rowClassNameAddition={
          isBulkEditEnabled ? rowClassNameAddition : undefined
        }
      />
    </Flex>
  )
}
