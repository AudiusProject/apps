import { useCallback, useContext, useState } from 'react'

import {
  WithdrawUSDCModalPages,
  accountSelectors,
  formatUSDCWeiToFloorCentsNumber,
  useAllPaginatedQuery,
  useUSDCTransactionDetailsModal,
  useWithdrawUSDCModal
} from '@audius/common'
import {
  useGetUSDCTransactions,
  useGetUSDCTransactionsCount,
  Id
} from '@audius/common/api'
import { useUSDCBalance } from '@audius/common/hooks'
import {
  Name,
  Status,
  statusIsNotFinalized,
  combineStatuses,
  USDCTransactionDetails,
  BNUSDC
} from '@audius/common/models'
import { full } from '@audius/sdk'
import BN from 'bn.js'

import { useErrorPageOnFailedStatus } from 'hooks/useErrorPageOnFailedStatus'
import { useIsMobile } from 'hooks/useIsMobile'
import { MainContentContext } from 'pages/MainContentContext'
import { make, track } from 'services/analytics'
import { audiusBackendInstance } from 'services/audius-backend/audius-backend-instance'
import { audiusSdk } from 'services/audius-sdk'
import { formatToday } from 'utils/dateUtils'
import { useSelector } from 'utils/reducer'

import styles from '../PayAndEarnPage.module.css'

import { NoTransactionsContent } from './NoTransactionsContent'
import {
  WithdrawalsTable,
  WithdrawalsTableColumn,
  WithdrawalsTableSortDirection,
  WithdrawalsTableSortMethod
} from './WithdrawalsTable'

const { getUserId } = accountSelectors

const messages = {
  pageTitle: 'Withdrawal History',
  pageDescription: 'View your withdrawal history',
  noWithdrawalsHeader: `You haven't made any withdrawals yet.`,
  noWithdrawalsBody: 'Once you complete a withdrawal, it will show up here.',
  noWithdrawalsCTA: 'Withdraw Funds',
  backToDashboard: 'Back To Your Dashboard',
  headerText: 'Withdrawal History',
  downloadCSV: 'Download CSV'
}

const TRANSACTIONS_BATCH_SIZE = 50

const sortMethods: {
  [k in WithdrawalsTableSortMethod]: full.GetUSDCTransactionsSortMethodEnum
} = {
  date: full.GetUSDCTransactionsSortMethodEnum.Date
}

const sortDirections: {
  [k in WithdrawalsTableSortDirection]: full.GetUSDCTransactionsSortDirectionEnum
} = {
  asc: full.GetUSDCTransactionsSortDirectionEnum.Asc,
  desc: full.GetUSDCTransactionsSortDirectionEnum.Desc
}

const DEFAULT_SORT_METHOD = full.GetUSDCTransactionsSortMethodEnum.Date
const DEFAULT_SORT_DIRECTION = full.GetUSDCTransactionsSortDirectionEnum.Desc

const NoWithdrawals = () => {
  const { onOpen: openWithdrawUSDCModal } = useWithdrawUSDCModal()
  const { data: balance } = useUSDCBalance()
  const balanceCents = formatUSDCWeiToFloorCentsNumber(
    (balance ?? new BN(0)) as BNUSDC
  )

  const handleWithdraw = () => {
    openWithdrawUSDCModal({
      page: WithdrawUSDCModalPages.ENTER_TRANSFER_DETAILS
    })
    track(
      make({
        eventName: Name.WITHDRAW_USDC_MODAL_OPENED,
        currentBalance: balanceCents / 100
      })
    )
  }

  return (
    <NoTransactionsContent
      headerText={messages.noWithdrawalsHeader}
      bodyText={messages.noWithdrawalsBody}
      ctaText={messages.noWithdrawalsCTA}
      onCTAClicked={handleWithdraw}
    />
  )
}

export const useWithdrawals = () => {
  const userId = useSelector(getUserId)
  // Defaults: sort method = date, sort direction = desc
  const [sortMethod, setSortMethod] =
    useState<full.GetUSDCTransactionsSortMethodEnum>(DEFAULT_SORT_METHOD)
  const [sortDirection, setSortDirection] =
    useState<full.GetUSDCTransactionsSortDirectionEnum>(DEFAULT_SORT_DIRECTION)

  const { onOpen: openDetailsModal } = useUSDCTransactionDetailsModal()

  const {
    status: dataStatus,
    data: transactions,
    hasMore,
    loadMore
  } = useAllPaginatedQuery(
    useGetUSDCTransactions,
    {
      userId,
      sortMethod,
      sortDirection,
      type: full.GetUSDCTransactionsTypeEnum.Transfer,
      method: full.GetUSDCTransactionsMethodEnum.Send
    },
    { disabled: !userId, pageSize: TRANSACTIONS_BATCH_SIZE, force: true }
  )
  const { status: countStatus, data: count } = useGetUSDCTransactionsCount(
    {
      userId,
      type: full.GetUSDCTransactionsTypeEnum.Transfer,
      method: full.GetUSDCTransactionsMethodEnum.Send
    },
    { force: true }
  )

  const status = combineStatuses([dataStatus, countStatus])
  useErrorPageOnFailedStatus({ status })

  const onSort = useCallback(
    (
      method: WithdrawalsTableSortMethod,
      direction: WithdrawalsTableSortDirection
    ) => {
      setSortMethod(sortMethods[method] ?? DEFAULT_SORT_METHOD)
      setSortDirection(sortDirections[direction] ?? DEFAULT_SORT_DIRECTION)
    },
    []
  )

  const fetchMore = useCallback(() => {
    if (hasMore) {
      loadMore()
    }
  }, [hasMore, loadMore])

  const onClickRow = useCallback(
    (transactionDetails: USDCTransactionDetails) => {
      openDetailsModal({ transactionDetails })
    },
    [openDetailsModal]
  )

  const isEmpty = status === Status.SUCCESS && transactions.length === 0
  const isLoading = statusIsNotFinalized(status)

  const downloadCSV = useCallback(async () => {
    const sdk = await audiusSdk()
    const { data: encodedDataMessage, signature: encodedDataSignature } =
      await audiusBackendInstance.signDiscoveryNodeRequest()
    const blob = await sdk.users.downloadUSDCWithdrawalsAsCSVBlob({
      id: Id.parse(userId!),
      encodedDataMessage,
      encodedDataSignature
    })
    const blobUrl = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = `audius_withdrawals_${formatToday()}.csv`
    a.click()
    window.URL.revokeObjectURL(blobUrl)
  }, [userId])

  return {
    count,
    data: transactions,
    fetchMore,
    onSort,
    onClickRow,
    isEmpty,
    isLoading,
    downloadCSV
  }
}

/**
 * Fetches and renders a table of withdrawals for the currently logged in user
 * */
export const WithdrawalsTab = ({
  count,
  data: transactions,
  fetchMore,
  onSort,
  onClickRow,
  isEmpty,
  isLoading
}: Omit<ReturnType<typeof useWithdrawals>, 'downloadCSV'>) => {
  const isMobile = useIsMobile()
  const { mainContentRef } = useContext(MainContentContext)

  const columns = isMobile
    ? (['date', 'amount'] as WithdrawalsTableColumn[])
    : undefined

  return (
    <div className={styles.container}>
      {isEmpty ? (
        <NoWithdrawals />
      ) : (
        <WithdrawalsTable
          key='withdrawals'
          columns={columns}
          data={transactions}
          loading={isLoading}
          onSort={onSort}
          onClickRow={onClickRow}
          fetchMore={fetchMore}
          isVirtualized={true}
          scrollRef={mainContentRef}
          totalRowCount={count}
          fetchBatchSize={TRANSACTIONS_BATCH_SIZE}
        />
      )}
    </div>
  )
}
