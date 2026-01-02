import { MouseEvent, useCallback, useMemo, useRef } from 'react'

import {
  CollectionMetadata,
  UserCollectionMetadata
} from '@audius/common/models'
import { dayjs, formatCount } from '@audius/common/utils'
import { Flex, IconCart, IconVisibilityHidden } from '@audius/harmony'
import cn from 'classnames'
import { Cell, Row } from 'react-table'

import { TextLink } from 'components/link'
import { Table, alphaSorter, dateSorter, numericSorter } from 'components/table'

import styles from './CollectionsTable.module.css'
import { CollectionsTableOverflowMenuButton } from './CollectionsTableOverflowMenuButton'

type RowInfo = UserCollectionMetadata & {
  name: string
  artist: string
  date: string
  dateSaved: string
  dateAdded: string
}

type CollectionCell = Cell<RowInfo>

type CollectionRow = Row<RowInfo>

export type CollectionsTableColumn =
  | 'name'
  | 'overflowMenu'
  | 'releaseDate'
  | 'reposts'
  | 'saves'
  | 'spacer'

type CollectionsTableProps = {
  columns?: CollectionsTableColumn[]
  data: any[]
  isVirtualized?: boolean
  loading?: boolean
  defaultSorter?: (a: any, b: any) => number
  fetchMore?: (offset: number, limit: number) => void
  fetchBatchSize?: number
  onClickRow?: (collection: CollectionMetadata, index: number) => void
  scrollRef?: React.MutableRefObject<HTMLDivElement | undefined>
  showMoreLimit?: number
  totalRowCount?: number
  tableHeaderClassName?: string
}

const defaultColumns: CollectionsTableColumn[] = [
  'name',
  'overflowMenu',
  'releaseDate',
  'reposts',
  'saves',
  'spacer'
]

/**
 * Note: this table is not generalized the way TracksTable is. It is
 * specifically tailored to the Artist Dashboard use case.
 */
export const CollectionsTable = ({
  columns = defaultColumns,
  data,
  defaultSorter,
  fetchBatchSize,
  fetchMore,
  isVirtualized = false,
  loading = false,
  onClickRow,
  scrollRef,
  showMoreLimit,
  totalRowCount,
  tableHeaderClassName
}: CollectionsTableProps) => {
  // Cell Render Functions
  const renderNameCell = useCallback((cellInfo: CollectionCell) => {
    const collection = cellInfo.row.original
    const deleted = collection.is_delete || !!collection.user?.is_deactivated

    return (
      <Flex
        gap='xs'
        w='100%'
        css={{
          overflow: 'hidden',
          position: 'relative',
          display: 'inline-flex'
        }}
      >
        <TextLink
          to={deleted ? '' : (collection.permalink ?? '')}
          textVariant='title'
          size='s'
          strength='weak'
          css={{ display: 'block' }}
          ellipses
        >
          {collection.playlist_name}
          {deleted ? ` [Deleted By Artist]` : ''}
        </TextLink>
      </Flex>
    )
  }, [])

  const renderRepostsCell = useCallback((cellInfo: CollectionCell) => {
    const collection = cellInfo.row.original
    return formatCount(collection.repost_count)
  }, [])

  const renderSavesCell = useCallback((cellInfo: CollectionCell) => {
    const collection = cellInfo.row.original
    return formatCount(collection.save_count)
  }, [])

  const renderReleaseDateCell = useCallback((cellInfo: CollectionCell) => {
    const collection = cellInfo.row.original
    return dayjs(collection.release_date ?? collection.created_at).format(
      'M/D/YY'
    )
  }, [])

  const overflowMenuRef = useRef<HTMLDivElement>(null)
  const renderOverflowMenuCell = useCallback((cellInfo: CollectionCell) => {
    const collection = cellInfo.row.original
    const Icon = collection.is_private
      ? IconVisibilityHidden
      : collection.is_stream_gated
        ? IconCart
        : null
    return (
      <>
        {Icon ? (
          <Flex className={styles.typeIcon}>
            <Icon color='subdued' size='m' />
          </Flex>
        ) : null}
        <div ref={overflowMenuRef} className={styles.overflowMenu}>
          <CollectionsTableOverflowMenuButton
            collectionId={collection.playlist_id}
          />
        </div>
      </>
    )
  }, [])

  // Columns
  const tableColumnMap = useMemo(
    () => ({
      name: {
        id: 'name',
        Header: 'Album Name',
        accessor: 'title',
        Cell: renderNameCell,
        maxWidth: 300,
        width: 120,
        sortTitle: 'Album Name',
        sorter: alphaSorter('title'),
        align: 'left'
      },
      releaseDate: {
        id: 'dateReleased',
        Header: 'Released',
        accessor: 'created_at',
        Cell: renderReleaseDateCell,
        maxWidth: 160,
        sortTitle: 'Date Released',
        sorter: dateSorter('created_at'),
        align: 'right'
      },
      reposts: {
        id: 'reposts',
        Header: 'Reposts',
        accessor: 'repost_count',
        Cell: renderRepostsCell,
        maxWidth: 160,
        sortTitle: 'Reposts',
        sorter: numericSorter('repost_count'),
        align: 'right'
      },
      saves: {
        id: 'saves',
        Header: 'Favorites',
        accessor: 'save_count',
        Cell: renderSavesCell,
        maxWidth: 160,
        sortTitle: 'Favorites',
        sorter: numericSorter('save_count'),
        align: 'right'
      },
      overflowMenu: {
        id: 'overflowMenu',
        Cell: renderOverflowMenuCell,
        minWidth: 64,
        maxWidth: 64,
        width: 64,
        disableResizing: true,
        disableSortBy: true
      },
      spacer: {
        id: 'spacer',
        maxWidth: 24,
        minWidth: 24,
        disableSortBy: true,
        disableResizing: true
      }
    }),
    [
      renderNameCell,
      renderReleaseDateCell,
      renderRepostsCell,
      renderSavesCell,
      renderOverflowMenuCell
    ]
  )

  const tableColumns = useMemo(
    () => columns.map((id) => tableColumnMap[id]),
    [columns, tableColumnMap]
  )

  const handleClickRow = useCallback(
    (
      e: MouseEvent<HTMLTableRowElement>,
      rowInfo: CollectionRow,
      index: number
    ) => {
      const collection = rowInfo.original
      onClickRow?.(collection, index)
    },
    [onClickRow]
  )

  const getRowClassName = useCallback(
    (rowIndex: number) => {
      const collection = data[rowIndex]
      const deleted = collection.is_delete || !!collection.user?.is_deactivated
      return cn(styles.tableRow, {
        [styles.disabled]: deleted
      })
    },
    [data]
  )

  return (
    <Table
      columns={tableColumns}
      data={data}
      defaultSorter={defaultSorter}
      fetchBatchSize={fetchBatchSize}
      fetchMore={fetchMore}
      getRowClassName={getRowClassName}
      isTracksTable
      isVirtualized={isVirtualized}
      loading={loading}
      onClickRow={handleClickRow}
      scrollRef={scrollRef}
      showMoreLimit={showMoreLimit}
      totalRowCount={totalRowCount}
      tableHeaderClassName={tableHeaderClassName}
    />
  )
}
