import { MouseEvent, useCallback, useMemo } from 'react'

import { USDCPurchaseDetails } from '@audius/common/models'
import { dayjs } from '@audius/common/utils'
import { USDC } from '@audius/fixed-decimal'

import { Table } from 'components/table'
import { RESPONSIVE_TABLE_POLICIES } from 'components/table/responsivePolicies'

import styles from '../PayAndEarnPage.module.css'
import { PurchaseCell, PurchaseRow } from '../types'
import { isEmptyPurchaseRow } from '../utils'

import { PurchaseArtistLink, TrackNameWithArtwork } from './TrackNameWithArtwork'
import artworkStyles from './TrackNameWithArtwork.module.css'

export type PurchasesTableColumn =
  | 'contentName'
  | 'date'
  | 'value'
  | 'spacerLeft'
  | 'spacerRight'

export type PurchasesTableSortMethod = 'contentId' | 'createdAt'
export type PurchasesTableSortDirection = 'asc' | 'desc'

type PurchasesTableProps = {
  columns?: PurchasesTableColumn[]
  data: USDCPurchaseDetails[]
  isVirtualized?: boolean
  loading?: boolean
  onClickRow?: (txDetails: USDCPurchaseDetails, index: number) => void
  onSort: (
    sortMethod: PurchasesTableSortMethod,
    sortDirection: PurchasesTableSortDirection
  ) => void
  fetchMore: (offset: number, limit: number) => void
  totalRowCount?: number
  scrollRef?: React.MutableRefObject<HTMLDivElement | undefined>
  fetchBatchSize: number
}

const defaultColumns: PurchasesTableColumn[] = [
  'contentName',
  'date',
  'value',
  'spacerRight'
]

// Cell Render Functions
const renderContentNameCell = (cellInfo: PurchaseCell) => {
  const { contentId, contentType, sellerUserId } = cellInfo.row.original
  return (
    <TrackNameWithArtwork
      id={contentId}
      contentType={contentType}
      secondary={<PurchaseArtistLink userId={sellerUserId} />}
    />
  )
}

const renderDateCell = (cellInfo: PurchaseCell) => {
  const transaction = cellInfo.row.original
  return dayjs(transaction.createdAt).format('M/D/YY')
}

const renderValueCell = (cellInfo: PurchaseCell) => {
  const transaction = cellInfo.row.original
  const total = BigInt(transaction.amount) + BigInt(transaction.extraAmount)
  return USDC(total).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

// Columns
const tableColumnMap = {
  contentName: {
    id: 'contentName',
    Header: <span className={artworkStyles.contentHeaderWithArtwork}>Purchases</span>,
    accessor: 'contentId',
    Cell: renderContentNameCell,
    width: 480,
    disableSortBy: false,
    align: 'left'
  },
  date: {
    id: 'date',
    Header: 'Date',
    accessor: 'createdAt',
    Cell: renderDateCell,
    maxWidth: 150,
    disableSortBy: false,
    align: 'right'
  },
  value: {
    id: 'value',
    Header: 'Value',
    accessor: 'amount',
    Cell: renderValueCell,
    maxWidth: 200,
    disableSortBy: true,
    align: 'right'
  },
  spacerLeft: {
    id: 'spacerLeft',
    maxWidth: 24,
    minWidth: 24,
    disableSortBy: true,
    disableResizing: true
  },
  spacerRight: {
    id: 'spacerRight',
    maxWidth: 24,
    minWidth: 24,
    disableSortBy: true,
    disableResizing: true
  }
}

/** Renders a table of `USDCPurchaseDetails` records with details intended for the Buyer */
export const PurchasesTable = ({
  columns = defaultColumns,
  data,
  isVirtualized = false,
  loading = false,
  onClickRow,
  onSort,
  fetchMore,
  totalRowCount,
  scrollRef,
  fetchBatchSize
}: PurchasesTableProps) => {
  const tableColumns = useMemo(
    () => columns.map((id) => tableColumnMap[id]),
    [columns]
  )

  const handleClickRow = useCallback(
    (
      _: MouseEvent<HTMLTableRowElement>,
      rowInfo: PurchaseRow,
      index: number
    ) => {
      onClickRow?.(rowInfo.original, index)
    },
    [onClickRow]
  )

  return (
    <Table
      columns={tableColumns}
      data={data}
      loading={loading}
      isEmptyRow={isEmptyPurchaseRow}
      onClickRow={handleClickRow}
      onSort={onSort}
      fetchMore={fetchMore}
      isVirtualized={isVirtualized}
      totalRowCount={totalRowCount ?? 0}
      scrollRef={scrollRef}
      fetchBatchSize={fetchBatchSize}
      wrapperClassName={styles.tableWrapper}
      responsiveColumns={RESPONSIVE_TABLE_POLICIES.purchases}
    />
  )
}
