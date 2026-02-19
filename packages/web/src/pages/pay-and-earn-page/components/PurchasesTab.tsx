import { useCallback, useEffect, useState } from 'react'

import {
  usePurchases as usePurchasesQuery,
  usePurchasesCount,
  useCurrentUserId
} from '@audius/common/api'
import { USDCPurchaseDetails } from '@audius/common/models'
import { useUSDCPurchaseDetailsModal } from '@audius/common/store'
import { route } from '@audius/common/utils'
import {
  Id,
  GetPurchasesSortMethodEnum,
  GetPurchasesSortDirectionEnum
} from '@audius/sdk'
import { useDispatch } from 'react-redux'

import { useIsMobile } from 'hooks/useIsMobile'
import { useMainContentRef } from 'pages/MainContentContext'
import { audiusSdk } from 'services/audius-sdk'
import { handleError } from 'store/errors/actions'
import { formatToday } from 'utils/dateUtils'
import { push } from 'utils/navigation'

import styles from '../PayAndEarnPage.module.css'

import { NoTransactionsContent } from './NoTransactionsContent'
import {
  PurchasesTable,
  PurchasesTableColumn,
  PurchasesTableSortDirection,
  PurchasesTableSortMethod
} from './PurchasesTable'

const { FEED_PAGE } = route

const messages = {
  pageTitle: 'Purchase History',
  pageDescription: 'View your purchase history',
  noPurchasesHeader: `You haven't bought anything yet.`,
  noPurchasesBody: 'Once you make a purchase, it will show up here.',
  findSongs: 'Find Songs',
  headerText: 'Your Purchases',
  downloadCSV: 'Download CSV'
}

const TRANSACTIONS_BATCH_SIZE = 50

const sortMethods: {
  [k in PurchasesTableSortMethod]: GetPurchasesSortMethodEnum
} = {
  contentId: GetPurchasesSortMethodEnum.ContentTitle,
  createdAt: GetPurchasesSortMethodEnum.Date,
  sellerUserId: GetPurchasesSortMethodEnum.ArtistName
}

const sortDirections: {
  [k in PurchasesTableSortDirection]: GetPurchasesSortDirectionEnum
} = {
  asc: GetPurchasesSortDirectionEnum.Asc,
  desc: GetPurchasesSortDirectionEnum.Desc
}

const DEFAULT_SORT_METHOD = GetPurchasesSortMethodEnum.Date
const DEFAULT_SORT_DIRECTION = GetPurchasesSortDirectionEnum.Desc

const NoPurchases = () => {
  const dispatch = useDispatch()
  const handleClickFindSongs = useCallback(() => {
    dispatch(push(FEED_PAGE))
  }, [dispatch])

  return (
    <NoTransactionsContent
      headerText={messages.noPurchasesHeader}
      bodyText={messages.noPurchasesBody}
      ctaText={messages.findSongs}
      onCTAClicked={handleClickFindSongs}
    />
  )
}

export const usePurchases = () => {
  const { data: userId } = useCurrentUserId()
  const dispatch = useDispatch()
  // Defaults: sort method = date, sort direction = desc
  const [sortMethod, setSortMethod] =
    useState<GetPurchasesSortMethodEnum>(DEFAULT_SORT_METHOD)
  const [sortDirection, setSortDirection] =
    useState<GetPurchasesSortDirectionEnum>(DEFAULT_SORT_DIRECTION)

  const { onOpen: openDetailsModal } = useUSDCPurchaseDetailsModal()

  const {
    data: purchases,
    isError: purchasesIsError,
    isSuccess: purchasesIsSuccess,
    isPending: purchasesIsPending,
    loadNextPage
  } = usePurchasesQuery({ userId, sortMethod, sortDirection })

  const {
    data: count,
    isError: countIsError,
    isSuccess: countIsSuccess
  } = usePurchasesCount({ userId })

  const hasQueryError = purchasesIsError || countIsError
  const isQuerySuccess = purchasesIsSuccess && countIsSuccess

  // TODO: Should fetch users before rendering the table

  const onSort = useCallback(
    (
      method: PurchasesTableSortMethod,
      direction: PurchasesTableSortDirection
    ) => {
      setSortMethod(sortMethods[method] ?? DEFAULT_SORT_METHOD)
      setSortDirection(sortDirections[direction] ?? DEFAULT_SORT_DIRECTION)
    },
    []
  )

  useEffect(() => {
    if (hasQueryError) {
      dispatch(
        handleError({
          message: 'Status: Failed',
          shouldReport: false,
          shouldRedirect: true
        })
      )
    }
  }, [hasQueryError, dispatch, countIsError])

  const onClickRow = useCallback(
    (purchaseDetails: USDCPurchaseDetails) => {
      openDetailsModal({ variant: 'purchase', purchaseDetails })
    },
    [openDetailsModal]
  )

  const isEmpty =
    hasQueryError || (isQuerySuccess && (!purchases || purchases.length === 0))

  const downloadCSV = useCallback(async () => {
    const sdk = await audiusSdk()
    const blob = await sdk.users.downloadPurchasesAsCSVBlob({
      id: Id.parse(userId!)
    })
    const blobUrl = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = `audius_purchases_${formatToday()}.csv`
    a.click()
    window.URL.revokeObjectURL(blobUrl)
  }, [userId])

  return {
    count,
    data: purchases,
    fetchMore: loadNextPage,
    onSort,
    onClickRow,
    isEmpty,
    isLoading: purchasesIsPending,
    downloadCSV
  }
}

/**
 * Fetches and renders a table of purchases for the currently logged in user
 * */
export const PurchasesTab = ({
  data = [],
  count,
  isEmpty,
  isLoading,
  onSort,
  onClickRow,
  fetchMore
}: Omit<ReturnType<typeof usePurchases>, 'downloadCSV'>) => {
  const mainContentRef = useMainContentRef()
  const isMobile = useIsMobile()

  const columns = isMobile
    ? (['contentName', 'date', 'value'] as PurchasesTableColumn[])
    : undefined

  return (
    <div className={styles.container}>
      {isEmpty ? (
        <NoPurchases />
      ) : (
        <PurchasesTable
          key='purchases'
          columns={columns}
          data={data}
          loading={isLoading}
          onSort={onSort}
          onClickRow={onClickRow}
          fetchMore={fetchMore}
          totalRowCount={count}
          scrollRef={mainContentRef}
          fetchBatchSize={TRANSACTIONS_BATCH_SIZE}
          isVirtualized={true}
        />
      )}
    </div>
  )
}
