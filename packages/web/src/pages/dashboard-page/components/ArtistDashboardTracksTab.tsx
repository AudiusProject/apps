import { useCallback } from 'react'

import { useCurrentAccountUser } from '@audius/common/api'
import { Status } from '@audius/common/models'
import { Nullable } from '@audius/common/utils'
import { Flex } from '@audius/harmony'
import { useDispatch, useSelector } from 'react-redux'

import { TracksTable, TracksTableColumn } from 'components/tracks-table'
import { useNavigateToPage } from 'hooks/useNavigateToPage'

import styles from '../DashboardPage.module.css'
import { getDashboardTracksStatus, makeGetDashboard } from '../store/selectors'
import { fetchTracks } from '../store/slice'

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
  'downloads',
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
  const dispatch = useDispatch()
  const navigate = useNavigateToPage()
  const tracksStatus = useSelector(getDashboardTracksStatus)

  const { data: accountUser } = useCurrentAccountUser()
  const { account } = useSelector(makeGetDashboard(accountUser))
  const filteredData = useFilteredTrackData({
    selectedFilter,
    filterText
  })

  const handleFetchPage = useCallback(
    (page: number) => {
      dispatch(
        fetchTracks({ offset: page * TABLE_PAGE_SIZE, limit: TABLE_PAGE_SIZE })
      )
    },
    [dispatch]
  )

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
        loading={tracksStatus === Status.LOADING}
        isPaginated
        tableHeaderClassName={styles.tableHeader}
        shouldShowGatedType
      />
    </Flex>
  )
}
