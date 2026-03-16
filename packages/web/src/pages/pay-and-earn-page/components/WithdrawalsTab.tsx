import { useCallback, useEffect, useState } from 'react'

import {
  useCurrentUserId,
  useUSDCTransactions,
  useUSDCTransactionsCount,
  useUSDCBalance
} from '@audius/common/api'
import { ID, Name, USDCTransactionDetails } from '@audius/common/models'
import {
  WithdrawUSDCModalPages,
  useUSDCTransactionDetailsModal,
  useWithdrawUSDCModal,
  withdrawUSDCSelectors
} from '@audius/common/store'
import { USDC } from '@audius/fixed-decimal'
import {
  Id,
  GetUSDCTransactionsSortDirectionEnum,
  GetUSDCTransactionsSortMethodEnum,
  GetUSDCTransactionsTypeEnum,
  GetUSDCTransactionsMethodEnum
} from '@audius/sdk/services'
import { useDispatch } from 'react-redux'
import { ThunkDispatch } from 'redux-thunk'

import { useIsMobile } from 'hooks/useIsMobile'
import { useMainContentRef } from 'pages/MainContentContext'
import { make, track } from 'services/analytics'
import { audiusSdk } from 'services/audius-sdk'
import { handleError } from 'store/errors/actions'
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
  [k in WithdrawalsTableSortMethod]: GetUSDCTransactionsSortMethodEnum
} = {
  date: GetUSDCTransactionsSortMethodEnum.Date
}

const sortDirections: {
  [k in WithdrawalsTableSortDirection]: GetUSDCTransactionsSortDirectionEnum
} = {
  asc: GetUSDCTransactionsSortDirectionEnum.Asc,
  desc: GetUSDCTransactionsSortDirectionEnum.Desc
}

const DEFAULT_SORT_METHOD = GetUSDCTransactionsSortMethodEnum.Date
const DEFAULT_SORT_DIRECTION = GetUSDCTransactionsSortDirectionEnum.Desc

const NoWithdrawals = () => {
  const { onOpen: openWithdrawUSDCModal } = useWithdrawUSDCModal()
  const { data: balance } = useUSDCBalance()

  const handleWithdraw = () => {
    openWithdrawUSDCModal({
      page: WithdrawUSDCModalPages.ENTER_TRANSFER_DETAILS
    })
    const balanceCents = Number(
      USDC(balance ?? 0)
        .floor(2)
        .toString()
    )
    track(
      make({
        eventName: Name.WITHDRAW_USDC_MODAL_OPENED,
        currentBalance: balanceCents
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

const useWithdrawalTransactionPoller = (
  userId: ID | null | undefined,
  lastCompletedTransaction: string | undefined,
  sortMethod: GetUSDCTransactionsSortMethodEnum,
  sortDirection: GetUSDCTransactionsSortDirectionEnum
) => {
  const [isPolling, setIsPolling] = useState(false)

  // Use the existing useUSDCTransactions hook
  const {
    data: transactions,
    isFetching: transactionsIsFetching,
    isSuccess: transactionsIsSuccess,
    isError: transactionsIsError,
    loadNextPage,
    reset
  } = useUSDCTransactions({
    sortMethod,
    sortDirection,
    type: [
      GetUSDCTransactionsTypeEnum.Withdrawal,
      GetUSDCTransactionsTypeEnum.Transfer
    ],
    method: GetUSDCTransactionsMethodEnum.Send
  })

  useEffect(() => {
    if (!lastCompletedTransaction || !userId) return

    setIsPolling(true)
    let timedOut = false
    const timerId = setTimeout(() => {
      timedOut = true
      setIsPolling(false)
    }, 60000)

    const pollInterval = setInterval(async () => {
      // Check if transaction exists in current data
      const found = transactions?.some(
        (t) => t.signature === lastCompletedTransaction
      )

      if (found) {
        clearInterval(pollInterval)
        clearTimeout(timerId)
        setIsPolling(false)
        return
      }

      // If we've timed out, stop polling
      if (timedOut) {
        clearInterval(pollInterval)
        return
      }

      // Refetch transactions
      await reset()
    }, 1000)

    // Cleanup
    return () => {
      clearInterval(pollInterval)
      clearTimeout(timerId)
      setIsPolling(false)
    }
  }, [lastCompletedTransaction, userId, transactions, reset])

  return {
    isPolling,
    transactions,
    transactionsIsFetching: transactionsIsFetching || isPolling,
    transactionsIsSuccess,
    transactionsIsError,
    loadNextPage
  }
}

export const useWithdrawals = () => {
  const { data: userId } = useCurrentUserId()
  // Type override required because we're dispatching thunk actions below
  const dispatch = useDispatch<ThunkDispatch<any, any, any>>()
  const lastCompletedTransaction = useSelector(
    withdrawUSDCSelectors.getLastCompletedTransactionSignature
  )
  // Defaults: sort method = date, sort direction = desc
  const [sortMethod, setSortMethod] =
    useState<GetUSDCTransactionsSortMethodEnum>(DEFAULT_SORT_METHOD)
  const [sortDirection, setSortDirection] =
    useState<GetUSDCTransactionsSortDirectionEnum>(DEFAULT_SORT_DIRECTION)

  const {
    transactions,
    transactionsIsFetching,
    transactionsIsSuccess,
    transactionsIsError,
    loadNextPage
  } = useWithdrawalTransactionPoller(
    userId,
    lastCompletedTransaction,
    sortMethod,
    sortDirection
  )
  const { onOpen: openDetailsModal } = useUSDCTransactionDetailsModal()

  const {
    isError: countIsError,
    data: transactionsCount,
    isPending: transactionsCountIsPending
  } = useUSDCTransactionsCount({
    method: GetUSDCTransactionsMethodEnum.Send
  })

  // Error handling
  useEffect(() => {
    if (transactionsIsError || countIsError) {
      dispatch(
        handleError({
          message: 'Status: Failed',
          shouldReport: false,
          shouldRedirect: true
        })
      )
    }
  }, [transactionsIsError, countIsError, dispatch])

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

  const onClickRow = useCallback(
    (transactionDetails: USDCTransactionDetails) => {
      openDetailsModal({ transactionDetails })
    },
    [openDetailsModal]
  )

  const isEmpty = transactionsIsSuccess && transactions?.length === 0
  const isLoading = transactionsIsFetching || transactionsCountIsPending

  const downloadCSV = useCallback(async () => {
    const sdk = await audiusSdk()
    const blob = await sdk.users.downloadUSDCWithdrawalsAsCSVBlob({
      id: Id.parse(userId!)
    })
    const blobUrl = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = `audius_withdrawals_${formatToday()}.csv`
    a.click()
    window.URL.revokeObjectURL(blobUrl)
  }, [userId])

  return {
    count: transactionsCount,
    data: transactions,
    fetchMore: loadNextPage,
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
  const mainContentRef = useMainContentRef()

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
          data={transactions ?? []}
          loading={isLoading}
          onSort={onSort}
          onClickRow={onClickRow}
          fetchMore={fetchMore}
          scrollRef={mainContentRef}
          totalRowCount={count}
          fetchBatchSize={TRANSACTIONS_BATCH_SIZE}
        />
      )}
    </div>
  )
}
