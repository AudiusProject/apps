import { useCallback } from 'react'

import { useCurrentAccountUser } from '@audius/common/api'
import { Nullable } from '@audius/common/utils'
import { Flex } from '@audius/harmony'
import { useSelector } from 'react-redux'

import {
  CollectionsTable,
  CollectionsTableColumn
} from 'components/collections-table'
import { RESPONSIVE_TABLE_POLICIES } from 'components/table/responsivePolicies'
import { useNavigateToPage } from 'hooks/useNavigateToPage'

import styles from '../DashboardPage.module.css'
import { makeGetDashboard } from '../store/selectors'

import { EmptySearchResults } from './EmptySearchResults'
import { EmptyTabState } from './EmptyTabState'
import { SHOW_MORE_LIMIT } from './constants'
import { useFilteredAlbumData } from './hooks'
import { AlbumFilters } from './types'

const albumTableColumns: CollectionsTableColumn[] = [
  'spacer',
  'name',
  'releaseDate',
  'saves',
  'reposts',
  'overflowMenu'
]

type ArtistDashboardAlbumsTabProps = {
  selectedFilter: Nullable<AlbumFilters>
  filterText: string
}

export const ArtistDashboardAlbumsTab = ({
  selectedFilter,
  filterText
}: ArtistDashboardAlbumsTabProps) => {
  const navigate = useNavigateToPage()
  const { data: accountUser } = useCurrentAccountUser()
  const { account } = useSelector(makeGetDashboard(accountUser))
  const filteredData = useFilteredAlbumData({
    selectedFilter,
    filterText
  })

  const onClickRow = useCallback(
    (collection: any) => {
      if (!account) return
      navigate(collection.permalink)
    },
    [account, navigate]
  )

  return !filteredData.length || !account ? (
    filterText ? (
      <EmptySearchResults />
    ) : (
      <EmptyTabState type='album' />
    )
  ) : (
    <Flex w='100%' direction='column' borderTop='default'>
      <CollectionsTable
        data={filteredData}
        columns={albumTableColumns}
        onClickRow={onClickRow}
        showMoreLimit={SHOW_MORE_LIMIT}
        totalRowCount={account.track_count}
        tableHeaderClassName={styles.tableHeader}
        responsiveColumns={RESPONSIVE_TABLE_POLICIES.dashboardAlbums}
      />
    </Flex>
  )
}
