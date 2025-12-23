import { MouseEvent, useCallback, useMemo } from 'react'

import { Kind } from '@audius/common/models'
import {
  TransactionType,
  TransactionMethod,
  TransactionDetails
} from '@audius/common/store'
import { wAUDIO } from '@audius/fixed-decimal'
import { Tooltip } from '@audius/harmony'
import cn from 'classnames'
import moment from 'moment'
import { Cell, Row } from 'react-table'

import { AudioTransactionIcon } from 'components/audio-transaction-icon'
import { Table } from 'components/table'
import { TableProps } from 'components/table/Table'

import styles from './AudioTransactionsTable.module.css'

const transactionTypeLabelMap: Record<TransactionType, string> = {
  [TransactionType.TRANSFER]: '$AUDIO',
  [TransactionType.CHALLENGE_REWARD]: '$AUDIO Reward Earned',
  [TransactionType.TRENDING_REWARD]: 'Trending Competition Award',
  [TransactionType.TIP]: 'Tip',
  [TransactionType.PURCHASE]: 'Purchased $AUDIO'
}

const transactionMethodLabelMap: Record<TransactionMethod, string | null> = {
  [TransactionMethod.COINBASE]: null,
  [TransactionMethod.STRIPE]: null,
  [TransactionMethod.RECEIVE]: 'Received',
  [TransactionMethod.SEND]: 'Sent'
}

type TransactionCell = Cell<TransactionDetails>
type TransactionRow = Row<TransactionDetails>

type AudioTransactionsTableColumn =
  | 'balance'
  | 'change'
  | 'date'
  | 'transactionType'
  | 'spacer'
  | 'spacer2'

type AudioTransactionsTableProps = Omit<
  TableProps,
  'columns' | 'data' | 'onClickRow'
> & {
  columns?: AudioTransactionsTableColumn[]
  data: (TransactionDetails | {})[]
  onClickRow?: (txDetails: TransactionDetails, index: number) => void
}

const defaultColumns: AudioTransactionsTableColumn[] = [
  'spacer',
  'transactionType',
  'date',
  'change',
  'balance',
  'spacer2'
]

export const isChangePositive = (tx: TransactionDetails) => {
  return (
    tx.transactionType === TransactionType.PURCHASE ||
    tx.method === TransactionMethod.RECEIVE
  )
}

// Cell Render Functions
const renderTransactionTypeCell = (cellInfo: TransactionCell) => {
  const { transactionType, method } = cellInfo.row.original
  const typeText = transactionTypeLabelMap[transactionType as TransactionType]
  const methodText =
    transactionMethodLabelMap[method as TransactionMethod] ?? ''

  const isTransferType =
    transactionType === TransactionType.TIP ||
    transactionType === TransactionType.TRANSFER
  return (
    <>
      <div className={styles.icon}>
        <AudioTransactionIcon type={transactionType} method={method} />
      </div>
      <span className={styles.typeText}>
        {`${typeText} ${isTransferType ? methodText : ''}`.trim()}
      </span>
    </>
  )
}

const renderBalanceCell = (cellInfo: TransactionCell) => {
  const transaction = cellInfo.row.original
  return transaction.balance
    ? wAUDIO(BigInt(transaction.balance)).toLocaleString('en-US', {
        maximumFractionDigits: 0
      })
    : ''
}

const renderDateCell = (cellInfo: TransactionCell) => {
  const transaction = cellInfo.row.original
  return moment(transaction.date).format('M/D/YY')
}

const renderChangeCell = (cellInfo: TransactionCell) => {
  const tx = cellInfo.row.original
  const { change } = tx
  return (
    <Tooltip
      text={`${wAUDIO(tx.change).toLocaleString('en-US', {
        maximumFractionDigits: 2,
        minimumFractionDigits: 2
      })} $AUDIO`}
      mount={'body'}
    >
      <div
        className={cn(
          styles.changeCell,
          isChangePositive(tx) ? styles.increase : styles.decrease
        )}
      >
        {wAUDIO(BigInt(change)).toLocaleString('en-US', {
          maximumFractionDigits: 0
        })}
      </div>
    </Tooltip>
  )
}

const isEmptyRow = (row: any) => {
  return Boolean(
    !row?.original?.signature || row?.original?.kind === Kind.EMPTY
  )
}

// Columns
const tableColumnMap = {
  transactionType: {
    id: 'transactionType',
    Header: 'Transaction Type',
    accessor: 'type',
    Cell: renderTransactionTypeCell,
    width: 150,
    disableSortBy: false,
    align: 'left'
  },
  date: {
    id: 'date',
    Header: 'Date',
    accessor: 'date',
    Cell: renderDateCell,
    disableSortBy: false,
    align: 'right'
  },
  change: {
    id: 'change',
    Header: 'Change',
    accessor: 'change',
    Cell: renderChangeCell,
    disableSortBy: true,
    align: 'right'
  },
  balance: {
    id: 'balance',
    Header: 'Balance',
    accessor: 'balance',
    Cell: renderBalanceCell,
    disableSortBy: true,
    align: 'right'
  },
  spacer: {
    id: 'spacer',
    maxWidth: 24,
    minWidth: 24,
    disableSortBy: true,
    disableResizing: true
  },
  spacer2: {
    id: 'spacer2',
    maxWidth: 24,
    minWidth: 24,
    disableSortBy: true,
    disableResizing: true
  }
}

export const AudioTransactionsTable = ({
  columns = defaultColumns,
  onClickRow,
  ...other
}: AudioTransactionsTableProps) => {
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
      onClickRow={handleClickRow}
      isEmptyRow={isEmptyRow}
      {...other}
    />
  )
}
