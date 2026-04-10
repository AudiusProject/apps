import { MouseEvent, useCallback, useMemo } from 'react'

import {
  USDCTransactionDetails,
  USDCTransactionType
} from '@audius/common/models'
import { dayjs } from '@audius/common/utils'
import { USDC } from '@audius/fixed-decimal'

import { Table } from 'components/table'
import { RESPONSIVE_TABLE_POLICIES } from 'components/table/responsivePolicies'

import payAndEarnStyles from '../PayAndEarnPage.module.css'
import { TransactionCell, TransactionRow } from '../types'
import { isEmptyTransactionRow } from '../utils'

import styles from './WithdrawalsTable.module.css'

const messages = {
  cash: 'Cash',
  crypto: 'Crypto'
}

export type WithdrawalsTableColumn =
  | 'destination'
  | 'date'
  | 'amount'
  | 'spacerLeft'
  | 'spacerRight'

export type WithdrawalsTableSortMethod = 'date'
export type WithdrawalsTableSortDirection = 'asc' | 'desc'

type WithdrawalsTableProps = {
  columns?: WithdrawalsTableColumn[]
  data: USDCTransactionDetails[]
  isVirtualized?: boolean
  loading?: boolean
  onClickRow?: (txDetails: USDCTransactionDetails, index: number) => void
  onSort: (
    sortMethod: WithdrawalsTableSortMethod,
    sortDirection: WithdrawalsTableSortDirection
  ) => void
  fetchMore: () => void
  totalRowCount?: number
  scrollRef?: React.MutableRefObject<HTMLDivElement | undefined>
  fetchBatchSize: number
}

const defaultColumns: WithdrawalsTableColumn[] = [
  'spacerLeft',
  'destination',
  'date',
  'amount',
  'spacerRight'
]

// Cell Render Functions
const renderDestinationCell = (cellInfo: TransactionCell) => {
  const { transactionType } = cellInfo.row.original
  let destination = ''
  switch (transactionType) {
    case USDCTransactionType.WITHDRAWAL:
      destination = messages.cash
      break
    case USDCTransactionType.TRANSFER:
      destination = messages.crypto
      break
    default:
      console.error(
        `Unexpected transaction type for withdrawal: ${transactionType}`
      )
      break
  }

  return <span className={styles.text}>{destination}</span>
}

const renderDateCell = (cellInfo: TransactionCell) => {
  const transaction = cellInfo.row.original
  return dayjs(transaction.transactionDate).format('M/D/YY')
}

const renderAmountCell = (cellInfo: TransactionCell) => {
  const transaction = cellInfo.row.original
  return USDC(BigInt(transaction.change)).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

// Columns
const tableColumnMap = {
  destination: {
    id: 'destination',
    Header: 'Method',
    accessor: 'metadata',
    Cell: renderDestinationCell,
    width: 480,
    disableSortBy: false,
    align: 'left'
  },
  date: {
    id: 'date',
    Header: 'Date',
    accessor: 'date',
    Cell: renderDateCell,
    maxWidth: 150,
    disableSortBy: false,
    align: 'right'
  },
  amount: {
    id: 'amount',
    Header: 'Amount',
    accessor: 'amount',
    Cell: renderAmountCell,
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

/** Renders a table of `USDCTransactionDetails` records */
export const WithdrawalsTable = ({
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
}: WithdrawalsTableProps) => {
  const tableColumns = useMemo(
    () => columns.map((id) => tableColumnMap[id]),
    [columns]
  )

  const handleClickRow = useCallback(
    (
      _: MouseEvent<HTMLTableRowElement>,
      rowInfo: TransactionRow,
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
      isEmptyRow={isEmptyTransactionRow}
      onClickRow={handleClickRow}
      onSort={onSort}
      fetchMore={fetchMore}
      isVirtualized={isVirtualized}
      totalRowCount={totalRowCount ?? 0}
      scrollRef={scrollRef}
      fetchBatchSize={fetchBatchSize}
      wrapperClassName={payAndEarnStyles.tableWrapper}
      responsiveColumns={RESPONSIVE_TABLE_POLICIES.withdrawals}
    />
  )
}
